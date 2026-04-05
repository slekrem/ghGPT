using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class IssueLabelNode
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;
}
