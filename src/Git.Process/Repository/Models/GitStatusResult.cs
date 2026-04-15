namespace Git.Process.Repository.Models;

public class GitStatusResult
{
    public IReadOnlyList<GitStatusEntry> Staged { get; init; } = [];
    public IReadOnlyList<GitStatusEntry> Unstaged { get; init; } = [];
}
