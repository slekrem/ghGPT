using ghGPT.Ai.Abstractions;
using ghGPT.Ai.Ollama;
using ghGPT.Ai.Tools;
using ghGPT.Core.Ai;
using NSubstitute;

namespace ghGPT.Ai.Tests;

public class ChatServiceTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IChatHistoryService _historyService = Substitute.For<IChatHistoryService>();
    private readonly IToolDispatcher _toolDispatcher = Substitute.For<IToolDispatcher>();
    private readonly IChatContextBuilder _contextBuilder = Substitute.For<IChatContextBuilder>();
    private readonly ChatService _sut;

    public ChatServiceTests()
    {
        _sut = new ChatService(_ollamaClient, _historyService, _toolDispatcher, _contextBuilder);

        _contextBuilder.BuildAsync(Arg.Any<ChatRequest>()).Returns(
        [
            new ChatMessage { Role = "system", Content = "System-Prompt" },
            new ChatMessage { Role = "user", Content = "Hallo" }
        ]);
        _historyService.Load(Arg.Any<string>()).Returns([]);

        _toolDispatcher.DispatchAsync(Arg.Any<ToolCall>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(("Tool-Ergebnis", "get_status", true));
    }

    // --- StreamAsync: History ---

    [Fact]
    public async Task StreamAsync_WithRepoId_SavesUserMessageToHistory()
    {
        SetupDirectAnswer("Antwort");

        await CollectEventsAsync(new ChatRequest { Message = "Hallo", RepoId = "repo-1" });

        _historyService.Received(1).Append("repo-1", "user", "Hallo");
    }

    [Fact]
    public async Task StreamAsync_WithoutRepoId_DoesNotSaveUserMessageToHistory()
    {
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(StringEnumerable("Antwort"));

        await CollectEventsAsync(new ChatRequest { Message = "Hallo" });

        _historyService.DidNotReceive().Append(Arg.Any<string>(), "user", Arg.Any<string>());
    }

    // --- StreamAsync: Tool-Loop ---

    [Fact]
    public async Task StreamAsync_WhenNoToolCall_YieldsTokenEventWithDirectAnswer()
    {
        SetupDirectAnswer("Hallo!");

        var events = await CollectEventsAsync(new ChatRequest { Message = "Hallo", RepoId = "repo-1" });

        var token = Assert.IsType<TokenEvent>(Assert.Single(events));
        Assert.Equal("Hallo!", token.Token);
    }

    [Fact]
    public async Task StreamAsync_WhenNoToolCall_DoesNotCallGenerateAsync()
    {
        SetupDirectAnswer("Direkte Antwort");

        await CollectEventsAsync(new ChatRequest { Message = "Hallo", RepoId = "repo-1" });

        _ = _ollamaClient.DidNotReceive().GenerateAsync(
            Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StreamAsync_WhenNoToolCall_SavesAnswerToHistory()
    {
        SetupDirectAnswer("Gespeicherte Antwort");

        await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "repo-1" });

        _historyService.Received(1).Append("repo-1", "assistant", "Gespeicherte Antwort");
    }

    [Fact]
    public async Task StreamAsync_WhenDirectAnswerIsEmpty_YieldsNoTokenEvent()
    {
        SetupDirectAnswer(string.Empty);

        var events = await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "repo-1" });

        Assert.DoesNotContain(events, e => e is TokenEvent);
    }

    [Fact]
    public async Task StreamAsync_WhenToolCallReturned_YieldsToolExecutedEvent()
    {
        SetupToolCallThenAnswer(
            new ToolCall { Id = "c1", Name = "get_status", ArgumentsJson = "{}" },
            "Keine Änderungen.");

        var events = await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-1" });

        Assert.Contains(events, e => e is ToolExecutedEvent { ToolName: "get_status", Success: true });
    }

    [Fact]
    public async Task StreamAsync_WhenToolCallReturned_FollowedByTokenEvent()
    {
        SetupToolCallThenAnswer(
            new ToolCall { Id = "c1", Name = "get_status", ArgumentsJson = "{}" },
            "Working tree ist sauber.");

        var events = await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-1" });

        Assert.Contains(events, e => e is ToolExecutedEvent);
        Assert.Contains(events, e => e is TokenEvent { Token: "Working tree ist sauber." });
    }

    [Fact]
    public async Task StreamAsync_WhenMaxRoundsReached_FallsThroughToGenerateAsync()
    {
        // LLM gibt immer Tool-Calls zurück → nach 5 Runden fällt es durch zu GenerateAsync
        var infiniteToolCall = new ToolCallResponse
        {
            HasToolCalls = true,
            ToolCalls = [new ToolCall { Id = "c1", Name = "get_status", ArgumentsJson = "{}" }]
        };
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(infiniteToolCall);

        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(StringEnumerable("Fallback-Antwort"));

        var events = await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-1" });

        await _ollamaClient.Received(5).CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>());
        _ = _ollamaClient.Received(1).GenerateAsync(
            Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>());
    }

    // --- StreamAsync: Kein Repo → GenerateAsync direkt ---

    [Fact]
    public async Task StreamAsync_WithoutRepoId_CallsGenerateAsyncDirectly()
    {
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(StringEnumerable("Antwort ohne Repo"));

        var events = await CollectEventsAsync(new ChatRequest { Message = "Hallo" });

        _ = _ollamaClient.DidNotReceive().CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>());
        var token = Assert.IsType<TokenEvent>(Assert.Single(events));
        Assert.Equal("Antwort ohne Repo", token.Token);
    }

    [Fact]
    public async Task StreamAsync_WithoutRepoId_DoesNotSaveAssistantResponseToHistory()
    {
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(StringEnumerable("Antwort"));

        await CollectEventsAsync(new ChatRequest { Message = "Hallo" });

        _historyService.DidNotReceive().Append(Arg.Any<string>(), "assistant", Arg.Any<string>());
    }

    [Fact]
    public async Task StreamAsync_WhenMaxRoundsReachedWithRepoId_SavesAssistantResponseToHistory()
    {
        var infiniteToolCall = new ToolCallResponse
        {
            HasToolCalls = true,
            ToolCalls = [new ToolCall { Id = "c1", Name = "get_status", ArgumentsJson = "{}" }]
        };
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(infiniteToolCall);

        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(StringEnumerable("Hallo", " Welt"));

        await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-1" });

        _historyService.Received(1).Append("repo-1", "assistant", "Hallo Welt");
    }

    // --- BuildAsync wird delegiert ---

    [Fact]
    public async Task StreamAsync_CallsContextBuilderBuildAsync()
    {
        SetupDirectAnswer("ok");
        var request = new ChatRequest { Message = "Test", RepoId = "repo-1" };

        await CollectEventsAsync(request);

        await _contextBuilder.Received(1).BuildAsync(request);
    }

    // --- Helper ---

    private void SetupDirectAnswer(string content)
    {
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = content });
    }

    private void SetupToolCallThenAnswer(ToolCall toolCall, string finalAnswer)
    {
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(
                new ToolCallResponse { HasToolCalls = true, ToolCalls = [toolCall] },
                new ToolCallResponse { HasToolCalls = false, Content = finalAnswer });
    }

    private async Task<List<ChatEvent>> CollectEventsAsync(ChatRequest request)
    {
        var events = new List<ChatEvent>();
        await foreach (var e in _sut.StreamAsync(request))
            events.Add(e);
        return events;
    }

    private static async IAsyncEnumerable<string> StringEnumerable(params string[] tokens)
    {
        foreach (var token in tokens)
            yield return await Task.FromResult(token);
    }
}
