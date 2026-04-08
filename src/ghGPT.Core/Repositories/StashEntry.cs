namespace ghGPT.Core.Repositories;

public record StashEntry
{
    public int Index { get; init; }
    public string Message { get; init; } = string.Empty;
    public string Branch { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}
