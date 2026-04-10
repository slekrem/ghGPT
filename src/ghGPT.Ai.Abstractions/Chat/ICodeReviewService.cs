namespace ghGPT.Ai.Abstractions;

public interface ICodeReviewService
{
    IAsyncEnumerable<string> StreamReviewAsync(string repoId, CancellationToken cancellationToken = default);
}
