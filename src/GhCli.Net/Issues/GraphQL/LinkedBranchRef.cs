using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchRef
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;
}
