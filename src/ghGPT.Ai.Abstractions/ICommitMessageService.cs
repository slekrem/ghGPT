namespace ghGPT.Ai.Abstractions;

public interface ICommitMessageService
{
    IAsyncEnumerable<string> StreamCommitMessageAsync(
        string repoId,
        int? linkedIssueNumber = null,
        string? linkedIssueTitle = null,
        string? linkedIssueBody = null,
        CancellationToken cancellationToken = default);
}
