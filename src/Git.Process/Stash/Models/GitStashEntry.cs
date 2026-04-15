namespace Git.Process.Stash.Models;

public class GitStashEntry
{
    public int Index { get; init; }
    public string Message { get; init; } = string.Empty;
    public string Branch { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}
