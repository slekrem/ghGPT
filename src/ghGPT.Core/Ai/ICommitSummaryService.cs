namespace ghGPT.Core.Ai;

public interface ICommitSummaryService
{
    IAsyncEnumerable<string> StreamSummaryAsync(string repoId, int count = 10, CancellationToken cancellationToken = default);
}
