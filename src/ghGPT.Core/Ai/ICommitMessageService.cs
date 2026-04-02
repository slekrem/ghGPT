namespace ghGPT.Core.Ai;

public interface ICommitMessageService
{
    IAsyncEnumerable<string> StreamCommitMessageAsync(string repoId, CancellationToken cancellationToken = default);
}
