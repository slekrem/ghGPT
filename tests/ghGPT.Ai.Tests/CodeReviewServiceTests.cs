using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Ai.Tests;

public class CodeReviewServiceTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly CodeReviewService _sut;

    public CodeReviewServiceTests()
    {
        var diffService = new DiffService(_repositoryService, NullLogger<DiffService>.Instance);
        _sut = new CodeReviewService(_ollamaClient, _repositoryService, diffService, NullLogger<CodeReviewService>.Instance);
    }

    [Fact]
    public async Task StreamReviewAsync_WithChanges_StreamsTokens()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "Foo.cs", Status = "Modified", IsStaged = true }],
            Unstaged = []
        });
        _repositoryService.GetCombinedDiff("repo-1", "Foo.cs").Returns("+ var x = null;");
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("## Zusammenfassung", "\nNulldereference-Risiko"));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamReviewAsync("repo-1"))
            tokens.Add(token);

        Assert.Equal(2, tokens.Count);
        Assert.Contains("## Zusammenfassung", tokens);
    }

    [Fact]
    public async Task StreamReviewAsync_IncludesStagedAndUnstagedFiles()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "A.cs", Status = "Modified", IsStaged = true }],
            Unstaged = [new FileStatusEntry { FilePath = "B.cs", Status = "Modified", IsStaged = false }]
        });
        _repositoryService.GetCombinedDiff("repo-1", "A.cs").Returns("+ classA");
        _repositoryService.GetCombinedDiff("repo-1", "B.cs").Returns("+ classB");

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("review"));

        await foreach (var _ in _sut.StreamReviewAsync("repo-1")) { }

        Assert.NotNull(captured);
        var userMsg = captured!.First(m => m.Role == "user");
        Assert.Contains("A.cs", userMsg.Content);
        Assert.Contains("B.cs", userMsg.Content);
    }

    [Fact]
    public async Task StreamReviewAsync_WithNoChanges_StillCallsOllama()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [],
            Unstaged = []
        });
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("Keine Änderungen."));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamReviewAsync("repo-1"))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
    }

    [Fact]
    public async Task StreamReviewAsync_WhenDiffThrows_SkipsFileAndContinues()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [
                new FileStatusEntry { FilePath = "good.cs", Status = "Modified", IsStaged = true },
                new FileStatusEntry { FilePath = "bad.cs", Status = "Modified", IsStaged = true }
            ],
            Unstaged = []
        });
        _repositoryService.GetCombinedDiff("repo-1", "good.cs").Returns("+ good");
        _repositoryService.GetCombinedDiff("repo-1", "bad.cs").Throws(new Exception("locked"));

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await foreach (var _ in _sut.StreamReviewAsync("repo-1")) { }

        Assert.NotNull(captured);
        var userMsg = captured!.First(m => m.Role == "user");
        Assert.Contains("good.cs", userMsg.Content);
        Assert.DoesNotContain("bad.cs", userMsg.Content);
    }

    [Fact]
    public async Task StreamReviewAsync_SystemPromptContainsReviewStructure()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "x.cs", Status = "Added", IsStaged = true }],
            Unstaged = []
        });
        _repositoryService.GetCombinedDiff("repo-1", "x.cs").Returns("+ int x;");

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("review"));

        await foreach (var _ in _sut.StreamReviewAsync("repo-1")) { }

        Assert.NotNull(captured);
        var systemMsg = captured!.First(m => m.Role == "system");
        Assert.Contains("Zusammenfassung", systemMsg.Content);
        Assert.Contains("Probleme", systemMsg.Content);
        Assert.Contains("Verbesserungsvorschläge", systemMsg.Content);
    }

    private static async IAsyncEnumerable<string> AsyncEnumerable(params string[] tokens)
    {
        foreach (var token in tokens)
            yield return await Task.FromResult(token);
    }
}
