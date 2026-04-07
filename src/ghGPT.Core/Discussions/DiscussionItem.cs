namespace ghGPT.Core.Discussions;

public record DiscussionItem
{
    public int Number { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public string Url { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public string AuthorLogin { get; init; } = string.Empty;
    public string CategoryName { get; init; } = string.Empty;
}
