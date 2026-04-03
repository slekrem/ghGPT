using ghGPT.Core.Ai;
using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Ai;
using NSubstitute;

namespace ghGPT.Infrastructure.Tests;

public class ChatServiceToolTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly IPullRequestService _pullRequestService = Substitute.For<IPullRequestService>();
    private readonly IChatHistoryService _historyService = Substitute.For<IChatHistoryService>();
    private readonly ChatService _sut;

    public ChatServiceToolTests()
    {
        _sut = new ChatService(_ollamaClient, _repositoryService, _pullRequestService, _historyService);

        // Standardmäßige Stub-Rückgaben für Repository-Kontext
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

    // --- Kein Tool-Call: direkte Antwort aus CompleteWithToolsAsync ---

    [Fact]
    public async Task StreamAsync_WhenNoToolCall_YieldsTokenEventWithDirectAnswer()
    {
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "Hallo!" });

        var events = await CollectEventsAsync(new ChatRequest { Message = "Hallo", RepoId = "repo-1" });

        Assert.Single(events);
        var token = Assert.IsType<TokenEvent>(events[0]);
        Assert.Equal("Hallo!", token.Token);
    }

    [Fact]
    public async Task StreamAsync_WhenNoToolCall_DoesNotCallGenerateAsync()
    {
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "Direkte Antwort" });

        await CollectEventsAsync(new ChatRequest { Message = "Hallo", RepoId = "repo-1" });

        _ = _ollamaClient.DidNotReceive().GenerateAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StreamAsync_WhenNoToolCall_SavesAnswerToHistory()
    {
        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(new ToolCallResponse { HasToolCalls = false, Content = "Gespeicherte Antwort" });

        await CollectEventsAsync(new ChatRequest { Message = "Test", RepoId = "repo-1" });

        _historyService.Received(1).Append("repo-1", "assistant", "Gespeicherte Antwort");
    }

    // --- Mit Tool-Call ---

    [Fact]
    public async Task StreamAsync_WhenToolCallReturned_YieldsToolExecutedEvent()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult { Staged = [], Unstaged = [] });

        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(
                new ToolCallResponse
                {
                    HasToolCalls = true,
                    ToolCalls = [new ToolCall { Id = "c1", Name = "get_status", ArgumentsJson = "{}" }]
                },
                new ToolCallResponse { HasToolCalls = false, Content = "Keine Änderungen." });

        var events = await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-1" });

        Assert.Contains(events, e => e is ToolExecutedEvent { ToolName: "get_status", Success: true });
    }

    [Fact]
    public async Task StreamAsync_WhenToolCallReturned_FollowedByTokenEvent()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult { Staged = [], Unstaged = [] });

        _ollamaClient.CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>())
            .Returns(
                new ToolCallResponse
                {
                    HasToolCalls = true,
                    ToolCalls = [new ToolCall { Id = "c1", Name = "get_status", ArgumentsJson = "{}" }]
                },
                new ToolCallResponse { HasToolCalls = false, Content = "Working tree ist sauber." });

        var events = await CollectEventsAsync(new ChatRequest { Message = "Status?", RepoId = "repo-1" });

        Assert.Contains(events, e => e is ToolExecutedEvent);
        Assert.Contains(events, e => e is TokenEvent { Token: "Working tree ist sauber." });
    }

    // --- Kein Repo: GenerateAsync direkt ---

    [Fact]
    public async Task StreamAsync_WithoutRepoId_CallsGenerateAsyncDirectly()
    {
        _ollamaClient.GenerateAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("Antwort ohne Repo"));

        var events = await CollectEventsAsync(new ChatRequest { Message = "Hallo" });

        _ = _ollamaClient.DidNotReceive().CompleteWithToolsAsync(
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<IEnumerable<ToolDefinition>>(),
            Arg.Any<CancellationToken>());

        Assert.Single(events);
        var token = Assert.IsType<TokenEvent>(events[0]);
        Assert.Equal("Antwort ohne Repo", token.Token);
    }

    // --- Helper ---

    private async Task<List<ChatEvent>> CollectEventsAsync(ChatRequest request)
    {
        var events = new List<ChatEvent>();
        await foreach (var e in _sut.StreamAsync(request))
            events.Add(e);
        return events;
    }

    private static async IAsyncEnumerable<string> AsyncEnumerable(params string[] tokens)
    {
        foreach (var token in tokens)
            yield return await Task.FromResult(token);
    }
}
