namespace ghGPT.Core.Issues;

public record IssueLabel
{
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
}
