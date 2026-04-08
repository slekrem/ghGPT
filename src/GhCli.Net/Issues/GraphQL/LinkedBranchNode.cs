using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchNode
{
    [JsonPropertyName("ref")]
    public LinkedBranchRef? Ref { get; init; }
}
