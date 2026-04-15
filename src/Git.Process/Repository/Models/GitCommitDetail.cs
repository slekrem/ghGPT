namespace Git.Process.Repository.Models;

public class GitCommitDetail
{
    public string Sha { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string FullMessage { get; init; } = string.Empty;
    public string AuthorName { get; init; } = string.Empty;
    public string AuthorEmail { get; init; } = string.Empty;
    public DateTimeOffset AuthorDate { get; init; }
    public IReadOnlyList<GitCommitFileChange> Files { get; init; } = [];
}
