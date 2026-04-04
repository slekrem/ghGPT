using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class IssueLabelConnection
{
    [JsonPropertyName("nodes")]
    public IReadOnlyList<IssueLabelNode> Nodes { get; init; } = [];
}
