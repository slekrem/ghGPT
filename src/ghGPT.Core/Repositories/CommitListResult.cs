namespace ghGPT.Core.Repositories;

public class CommitListResult
{
    public string Branch { get; init; } = string.Empty;
    public IReadOnlyList<CommitListItem> Commits { get; init; } = [];
    public bool HasMore { get; init; }
}
