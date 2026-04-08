using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchAssigneeConnection
{
    [JsonPropertyName("nodes")]
    public IReadOnlyList<LinkedBranchAssigneeNode> Nodes { get; init; } = [];
}
