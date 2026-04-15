namespace Git.Process.Repository.Models;

public class GitCommitListResult
{
    public string Branch { get; init; } = string.Empty;
    public IReadOnlyList<GitCommitEntry> Commits { get; init; } = [];
    public bool HasMore { get; init; }
}
