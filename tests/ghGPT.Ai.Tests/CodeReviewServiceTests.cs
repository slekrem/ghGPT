using ghGPT.Ai.Abstractions;
using ghGPT.Ai.Ollama;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ghGPT.Ai.Tests;

public class CodeReviewServiceTests
{
    private readonly IOllamaClient _ollamaClient = Substitute.For<IOllamaClient>();
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly IDiffService _diffService = Substitute.For<IDiffService>();
    private readonly CodeReviewService _sut;

    public CodeReviewServiceTests()
    {
        _sut = new CodeReviewService(_ollamaClient, _repositoryService, _diffService, NullLogger<CodeReviewService>.Instance);
    }

    [Fact]
    public async Task StreamReviewAsync_WithChanges_StreamsTokens()
    {
        _diffService.BuildCombinedDiff("repo-1").Returns("### Foo.cs\n+ var x = null;");
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
        _diffService.BuildCombinedDiff("repo-1").Returns("### A.cs\n+ classA\n### B.cs\n+ classB");

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
        _diffService.BuildCombinedDiff("repo-1").Returns(string.Empty);
        _ollamaClient.GenerateAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("Keine Änderungen."));

        var tokens = new List<string>();
        await foreach (var token in _sut.StreamReviewAsync("repo-1"))
            tokens.Add(token);

        Assert.NotEmpty(tokens);
    }

    [Fact]
    public async Task StreamReviewAsync_WhenDiffReturnsPartialResult_UsesAvailableDiff()
    {
        _diffService.BuildCombinedDiff("repo-1").Returns("### good.cs\n+ good");

        IEnumerable<ChatMessage>? captured = null;
        _ollamaClient.GenerateAsync(Arg.Do<IEnumerable<ChatMessage>>(m => captured = m), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await foreach (var _ in _sut.StreamReviewAsync("repo-1")) { }

        Assert.NotNull(captured);
        var userMsg = captured!.First(m => m.Role == "user");
        Assert.Contains("good.cs", userMsg.Content);
    }

    [Fact]
    public async Task StreamReviewAsync_SystemPromptContainsReviewStructure()
    {
        _diffService.BuildCombinedDiff("repo-1").Returns("### x.cs\n+ int x;");

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
