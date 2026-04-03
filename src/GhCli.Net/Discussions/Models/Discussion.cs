using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.Models;

public class Discussion
{
    [JsonPropertyName("number")]
    public int Number { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("body")]
    public string Body { get; init; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; init; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("author")]
    public DiscussionAuthor Author { get; init; } = new();

    [JsonPropertyName("category")]
    public DiscussionCategory Category { get; init; } = new();
}
