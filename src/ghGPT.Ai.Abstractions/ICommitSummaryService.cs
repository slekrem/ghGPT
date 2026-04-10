namespace ghGPT.Ai.Abstractions;

public interface ICommitSummaryService
{
    IAsyncEnumerable<string> StreamSummaryAsync(string repoId, int count = 10, CancellationToken cancellationToken = default);
}
