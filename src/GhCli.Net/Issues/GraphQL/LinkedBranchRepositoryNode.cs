using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchRepositoryNode
{
    [JsonPropertyName("issue")]
    public LinkedBranchIssueNode? Issue { get; init; }
}
