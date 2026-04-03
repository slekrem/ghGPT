using System.Text.Json.Serialization;

namespace GhCli.Net.PullRequests.Models;

public class PullRequest
{
    [JsonPropertyName("number")]
    public int Number { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty;

    [JsonPropertyName("author")]
    public PullRequestAuthor Author { get; init; } = new();

    [JsonPropertyName("headRefName")]
    public string HeadRefName { get; init; } = string.Empty;

    [JsonPropertyName("baseRefName")]
    public string BaseRefName { get; init; } = string.Empty;

    [JsonPropertyName("isDraft")]
    public bool IsDraft { get; init; }

    [JsonPropertyName("mergeable")]
    public string? Mergeable { get; init; }

    [JsonPropertyName("labels")]
    public List<PullRequestLabel> Labels { get; init; } = [];

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; init; }

    [JsonPropertyName("url")]
    public string Url { get; init; } = string.Empty;
}
