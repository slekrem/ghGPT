using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchIssueNode
{
    [JsonPropertyName("number")]
    public int Number { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; init; } = string.Empty;

    [JsonPropertyName("body")]
    public string? Body { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; init; }

    [JsonPropertyName("author")]
    public LinkedBranchAuthorNode? Author { get; init; }

    [JsonPropertyName("labels")]
    public LinkedBranchLabelConnection? Labels { get; init; }

    [JsonPropertyName("assignees")]
    public LinkedBranchAssigneeConnection? Assignees { get; init; }

    [JsonPropertyName("linkedBranches")]
    public LinkedBranchConnection? LinkedBranches { get; init; }
}
