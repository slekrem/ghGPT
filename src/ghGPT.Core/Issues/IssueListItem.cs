namespace ghGPT.Core.Issues;

public record IssueListItem
{
    public int Number { get; init; }
    public string Title { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public string AuthorLogin { get; init; } = string.Empty;
    public IReadOnlyList<IssueLabel> Labels { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public string Url { get; init; } = string.Empty;
}
