using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchLabelConnection
{
    [JsonPropertyName("nodes")]
    public IReadOnlyList<LinkedBranchLabelNode> Nodes { get; init; } = [];
}
