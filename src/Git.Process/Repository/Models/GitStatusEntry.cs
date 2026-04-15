namespace Git.Process.Repository.Models;

public class GitStatusEntry
{
    public string FilePath { get; init; } = string.Empty;
    public string? OldFilePath { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsStaged { get; init; }
}
