namespace ghGPT.Core.Releases;

public record ReleaseDetail
{
    public string TagName { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public bool IsDraft { get; init; }
    public bool IsPrerelease { get; init; }
    public string? Body { get; init; }
    public DateTimeOffset PublishedAt { get; init; }
    public string Url { get; init; } = string.Empty;
    public string AuthorLogin { get; init; } = string.Empty;
}
