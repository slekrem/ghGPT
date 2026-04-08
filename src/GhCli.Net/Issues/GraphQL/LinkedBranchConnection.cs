using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchConnection
{
    [JsonPropertyName("nodes")]
    public IReadOnlyList<LinkedBranchNode> Nodes { get; init; } = [];
}
