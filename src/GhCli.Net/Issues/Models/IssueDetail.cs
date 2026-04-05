using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.Models;

public record IssueDetail
{
    [JsonPropertyName("number")] public int Number { get; init; }
    [JsonPropertyName("title")] public string Title { get; init; } = string.Empty;
    [JsonPropertyName("state")] public string State { get; init; } = string.Empty;
    [JsonPropertyName("author")] public IssueAuthor Author { get; init; } = new();
    [JsonPropertyName("labels")] public IReadOnlyList<IssueLabel> Labels { get; init; } = [];
    [JsonPropertyName("assignees")] public IReadOnlyList<IssueAssignee> Assignees { get; init; } = [];
    [JsonPropertyName("body")] public string? Body { get; init; }
    [JsonPropertyName("createdAt")] public DateTimeOffset CreatedAt { get; init; }
    [JsonPropertyName("updatedAt")] public DateTimeOffset UpdatedAt { get; init; }
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
}
