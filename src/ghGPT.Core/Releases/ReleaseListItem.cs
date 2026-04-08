namespace ghGPT.Core.Releases;

public record ReleaseListItem
{
    public string TagName { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public bool IsDraft { get; init; }
    public bool IsPrerelease { get; init; }
    public bool IsLatest { get; init; }
    public DateTimeOffset PublishedAt { get; init; }
    public string Url { get; init; } = string.Empty;
}
