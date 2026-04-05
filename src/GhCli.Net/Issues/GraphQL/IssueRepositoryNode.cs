using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class IssueRepositoryNode
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("labels")]
    public IssueLabelConnection? Labels { get; init; }
}
