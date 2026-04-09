using System.Text.Json.Serialization;

namespace ghGPT.Api.Models;

public sealed class CommitMessageRequest
{
    [JsonPropertyName("linkedIssueNumber")]
    public int? LinkedIssueNumber { get; init; }

    [JsonPropertyName("linkedIssueTitle")]
    public string? LinkedIssueTitle { get; init; }

    [JsonPropertyName("linkedIssueBody")]
    public string? LinkedIssueBody { get; init; }
}
