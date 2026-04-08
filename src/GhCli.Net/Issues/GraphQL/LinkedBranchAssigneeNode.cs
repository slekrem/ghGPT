using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchAssigneeNode
{
    [JsonPropertyName("login")]
    public string Login { get; init; } = string.Empty;
}
