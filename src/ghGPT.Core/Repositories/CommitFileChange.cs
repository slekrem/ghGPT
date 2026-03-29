namespace ghGPT.Core.Repositories;

public class CommitFileChange
{
    public string Path { get; init; } = string.Empty;
    public string? OldPath { get; init; }
    public string Status { get; init; } = string.Empty;
    public int Additions { get; init; }
    public int Deletions { get; init; }
    public string Patch { get; init; } = string.Empty;
}
