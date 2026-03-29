namespace ghGPT.Core.Repositories;

public class CommitDetail
{
    public string Sha { get; init; } = string.Empty;
    public string ShortSha { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string FullMessage { get; init; } = string.Empty;
    public string AuthorName { get; init; } = string.Empty;
    public string AuthorEmail { get; init; } = string.Empty;
    public DateTimeOffset AuthorDate { get; init; }
    public IReadOnlyList<CommitFileChange> Files { get; init; } = [];
}
