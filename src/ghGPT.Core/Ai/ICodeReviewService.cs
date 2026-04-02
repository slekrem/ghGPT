namespace ghGPT.Core.Ai;

public interface ICodeReviewService
{
    IAsyncEnumerable<string> StreamReviewAsync(string repoId, CancellationToken cancellationToken = default);
}
