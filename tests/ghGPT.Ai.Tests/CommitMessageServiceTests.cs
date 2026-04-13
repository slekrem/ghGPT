using ghGPT.Ai.Abstractions;
using ghGPT.Ai.Ollama;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;


namespace ghGPT.Ai.Tests;

public class CommitMessageServiceTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly IDiffService _diffService = Substitute.For<IDiffService>();
    private readonly CommitMessageService _sut;

    public CommitMessageServiceTests()
    {
        _sut = new CommitMessageService(_ollamaClient, _repositoryService, _diffService, NullLogger<CommitMessageService>.Instance);
    }

    // --- StreamCommitMessageAsync ---

    [Fact]
    public async Task StreamCommitMessageAsync_WithStagedFiles_StreamsTokens()
    {
        _diffService.BuildStagedDiff("repo-1").Returns("### Program.cs\n+ var x = 1;");
        _repositoryService.GetHistory("repo-1", limit: 5).Returns([
            new CommitHistoryEntry { Message = "feat(api): add endpoint" },
            new CommitHistoryEntry { Message = "fix(ui): correct button color" }
        ]);
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("feat(api): add x variable"));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamCommitMessageAsync("repo-1"))
            tokens.Add(token);

        Assert.Single(tokens);
        Assert.Equal("feat(api): add x variable", tokens[0]);
    }

    [Fact]
    public async Task StreamCommitMessageAsync_WithNoStagedFiles_StillCallsOllama()
    {
        _diffService.BuildStagedDiff("repo-1").Returns(string.Empty);
        _repositoryService.GetHistory("repo-1", limit: 5).Returns([]);
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("Es gibt keine gestageten Änderungen."));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamCommitMessageAsync("repo-1"))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
        _ = _ollamaClient.Received(1).GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StreamCommitMessageAsync_IncludesRecentCommitsInSystemPrompt()
    {
        _diffService.BuildStagedDiff("repo-1").Returns("### foo.cs\n+ class Foo {}");
        _repositoryService.GetHistory("repo-1", limit: 5).Returns([
            new CommitHistoryEntry { Message = "feat(core): add Foo class" },
            new CommitHistoryEntry { Message = "refactor(core): extract interface" }
        ]);

        IEnumerable<ChatMessage>? capturedMessages = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => capturedMessages = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("feat(core): add Foo"));

        await foreach (var _ in _sut.StreamCommitMessageAsync("repo-1")) { }

        Assert.NotNull(capturedMessages);
        var styleMsg = capturedMessages!.First(m => m.Role == "user" && m.Content!.Contains("STIL-VORGABE"));
        Assert.Contains("feat(core): add Foo class", styleMsg.Content);
        Assert.Contains("refactor(core): extract interface", styleMsg.Content);
    }

    [Fact]
    public async Task StreamCommitMessageAsync_WhenHistoryThrows_StillStreams()
    {
        _diffService.BuildStagedDiff("repo-1").Returns("### bar.cs\n- old\n+ new");
        _repositoryService.GetHistory("repo-1", limit: 5).Throws(new Exception("git error"));
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("fix(bar): update bar"));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamCommitMessageAsync("repo-1"))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
    }

    [Fact]
    public async Task StreamCommitMessageAsync_WhenDiffReturnsPartialResult_UsesAvailableDiff()
    {
        _diffService.BuildStagedDiff("repo-1").Returns("### good.cs\n+ good");
        _repositoryService.GetHistory("repo-1", limit: 5).Returns([]);

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("feat: update good"));

        await foreach (var _ in _sut.StreamCommitMessageAsync("repo-1")) { }

        Assert.NotNull(captured);
        var userMsg = captured!.First(m => m.Role == "user");
        Assert.Contains("good.cs", userMsg.Content);
    }

    // --- Helper ---

    private static async IAsyncEnumerable<string> AsyncEnumerable(params string[] tokens)
    {
        foreach (var token in tokens)
            yield return await Task.FromResult(token);
    }
}
