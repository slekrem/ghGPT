using System.Text.Json.Serialization;

namespace GhCli.Net.PullRequests.Models;

public class PullRequestReview
{
    [JsonPropertyName("author")]
    public PullRequestAuthor Author { get; init; } = new();

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty;

    [JsonPropertyName("submittedAt")]
    public DateTimeOffset SubmittedAt { get; init; }
}
