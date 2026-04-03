namespace GhCli.Net.Models.Discussions;

public class Discussion
{
    public int Number { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public string Url { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DiscussionAuthor Author { get; init; } = new();
    public DiscussionCategory Category { get; init; } = new();
}
