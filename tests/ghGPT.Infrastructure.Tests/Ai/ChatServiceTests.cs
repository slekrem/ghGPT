using ghGPT.Core.Ai;
using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Ai;
using NSubstitute;

namespace ghGPT.Infrastructure.Tests.Ai;

public class ChatServiceTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly IPullRequestService _pullRequestService = Substitute.For<IPullRequestService>();
    private readonly IChatHistoryService _historyService = Substitute.For<IChatHistoryService>();
    private readonly ChatService _sut;

    public ChatServiceTests()
    {
        _sut = new ChatService(_ollamaClient, _repositoryService, _pullRequestService, _historyService);

        _repositoryService.GetAll().Returns([
            new RepositoryInfo { Id = "repo-1", Name = "Test", LocalPath = "/tmp/test" }
        ]);
        _repositoryService.GetBranches("repo-1").Returns([
            new BranchInfo { Name = "main", IsHead = true, IsRemote = false }
        ]);
        _repositoryService.GetHistory("repo-1", limit: 5).Returns([]);
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult { Staged = [], Unstaged = [] });
        _historyService.Load(Arg.Any<string>()).Returns([]);
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
    public async Task StreamAsync_WithoutRepoId_WhenGenerateAsyncStreams_SavesFullResponseToHistory()
    {
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(StringEnumerable("Hallo", " Welt"));

        // RepoId nötig damit History gespeichert wird
        _repositoryService.GetAll().Returns([
            new RepositoryInfo { Id = "repo-2", Name = "Repo2", LocalPath = "/tmp/repo2" }
        ]);
        _repositoryService.GetBranches("repo-2").Returns([]);
        _repositoryService.GetHistory("repo-2", limit: 5).Returns([]);
        _repositoryService.GetStatus("repo-2").Returns(new RepositoryStatusResult { Staged = [], Unstaged = [] });

        // Kein Tool-Loop-Ausgang → GenerateAsync-Pfad via MaxRounds überschritten
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

        await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-2" });

        _historyService.Received(1).Append("repo-2", "assistant", "Hallo Welt");
    }

    // --- BuildMessagesAsync ---

    [Fact]
    public async Task StreamAsync_AlwaysIncludesSystemPromptMessage()
    {
        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Do<IEnumerable<ChatMessage>>(m => captured = m),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "ok" });

        await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "repo-1" });

        Assert.NotNull(captured);
        Assert.Contains(captured!, m => m.Role == "system");
    }

    [Fact]
    public async Task StreamAsync_UserMessageIsLastInMessageList()
    {
        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Do<IEnumerable<ChatMessage>>(m => captured = m),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "ok" });

        await CollectEventsAsync(new ChatRequest { Message = "Meine Frage", RepoId = "repo-1" });

        Assert.NotNull(captured);
        var last = captured!.Last();
        Assert.Equal("user", last.Role);
        Assert.Equal("Meine Frage", last.Content);
    }

    [Fact]
    public async Task StreamAsync_IncludesHistoryEntriesInMessages()
    {
        _historyService.Load("repo-1").Returns([
            new ChatHistoryEntry { Role = "user", Content = "Vorherige Frage" },
            new ChatHistoryEntry { Role = "assistant", Content = "Vorherige Antwort" }
        ]);

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Do<IEnumerable<ChatMessage>>(m => captured = m),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "ok" });

        await CollectEventsAsync(new ChatRequest { Message = "Neue Frage", RepoId = "repo-1" });

        Assert.NotNull(captured);
        Assert.Contains(captured!, m => m.Role == "user" && m.Content == "Vorherige Frage");
        Assert.Contains(captured!, m => m.Role == "assistant" && m.Content == "Vorherige Antwort");
    }

    // --- BuildRepositoryContext ---

    [Fact]
    public async Task StreamAsync_WhenRepoFound_IncludesRepoContextInSystemMessage()
    {
        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Do<IEnumerable<ChatMessage>>(m => captured = m),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "ok" });

        await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "repo-1" });

        Assert.NotNull(captured);
        var systemMessages = captured!.Where(m => m.Role == "system").ToList();
        Assert.Contains(systemMessages, m => m.Content != null && m.Content.Contains("Test"));
    }

    [Fact]
    public async Task StreamAsync_WhenRepoNotFound_DoesNotThrow()
    {
        _repositoryService.GetAll().Returns([]);
        SetupDirectAnswer("ok");

        var events = await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "unknown" });

        Assert.NotEmpty(events);
    }

    [Fact]
    public async Task StreamAsync_WhenBranchServiceThrows_StillCompletes()
    {
        _repositoryService.When(s => s.GetBranches("repo-1")).Throw(new Exception("git error"));
        SetupDirectAnswer("ok");

        var events = await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "repo-1" });

        Assert.NotEmpty(events);
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
