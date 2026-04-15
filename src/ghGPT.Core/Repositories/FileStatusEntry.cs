namespace ghGPT.Core.Repositories;

public class FileStatusEntry
{
    public string FilePath { get; init; } = string.Empty;
    public string? OldFilePath { get; init; }
    public string Status { get; init; } = string.Empty; // "Modified", "Added", "Deleted", "Renamed", "Untracked"
    public bool IsStaged { get; init; }
}
