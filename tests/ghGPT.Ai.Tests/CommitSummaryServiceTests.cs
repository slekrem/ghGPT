using ghGPT.Ai.Abstractions;
using ghGPT.Ai.Ollama;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Ai.Tests;

public class CommitSummaryServiceTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly CommitSummaryService _sut;

    public CommitSummaryServiceTests()
    {
        _sut = new CommitSummaryService(_ollamaClient, _repositoryService, NullLogger<CommitSummaryService>.Instance);
    }

    [Fact]
    public async Task StreamSummaryAsync_WithCommits_StreamsTokens()
    {
        _repositoryService.GetHistory("repo-1", limit: 10).Returns([
            new CommitHistoryEntry { Message = "feat: add login" },
            new CommitHistoryEntry { Message = "fix: correct redirect" },
        ]);
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("In den letzten Commits wurde die Login-Funktion hinzugefügt."));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamSummaryAsync("repo-1", count: 10))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
    }

    [Fact]
    public async Task StreamSummaryAsync_IncludesAllCommitMessagesInPrompt()
    {
        _repositoryService.GetHistory("repo-1", limit: 5).Returns([
            new CommitHistoryEntry { Message = "feat: dashboard" },
            new CommitHistoryEntry { Message = "fix: typo in nav" },
            new CommitHistoryEntry { Message = "chore: update deps" },
        ]);

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("summary"));

        await foreach (var _ in _sut.StreamSummaryAsync("repo-1", count: 5)) { }

        Assert.NotNull(captured);
        var userMsg = captured!.First(m => m.Role == "user");
        Assert.Contains("feat: dashboard", userMsg.Content);
        Assert.Contains("fix: typo in nav", userMsg.Content);
        Assert.Contains("chore: update deps", userMsg.Content);
    }

    [Fact]
    public async Task StreamSummaryAsync_ClampCountTo50()
    {
        _repositoryService.GetHistory("repo-1", limit: 50).Returns([
            new CommitHistoryEntry { Message = "feat: something" }
        ]);
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await foreach (var _ in _sut.StreamSummaryAsync("repo-1", count: 999)) { }

        _repositoryService.Received(1).GetHistory("repo-1", limit: 50);
    }

    [Fact]
    public async Task StreamSummaryAsync_WithNoCommits_StillCallsOllama()
    {
        _repositoryService.GetHistory("repo-1", limit: 10).Returns([]);
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("Keine Commits vorhanden."));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamSummaryAsync("repo-1"))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
    }

    [Fact]
    public async Task StreamSummaryAsync_WhenHistoryThrows_StillCallsOllama()
    {
        _repositoryService.GetHistory("repo-1", limit: 10).Throws(new Exception("git error"));
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("fallback"));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamSummaryAsync("repo-1"))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
    }

    [Fact]
    public async Task StreamSummaryAsync_FiltersEmptyMessages()
    {
        _repositoryService.GetHistory("repo-1", limit: 10).Returns([
            new CommitHistoryEntry { Message = "feat: valid" },
            new CommitHistoryEntry { Message = "" },
            new CommitHistoryEntry { Message = "   " },
        ]);

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await foreach (var _ in _sut.StreamSummaryAsync("repo-1")) { }

        Assert.NotNull(captured);
        var userMsg = captured!.First(m => m.Role == "user");
        Assert.Contains("feat: valid", userMsg.Content);
        Assert.DoesNotContain("   ", userMsg.Content);
    }

    private static async IAsyncEnumerable<string> AsyncEnumerable(params string[] tokens)
    {
        foreach (var token in tokens)
            yield return await Task.FromResult(token);
    }
}
