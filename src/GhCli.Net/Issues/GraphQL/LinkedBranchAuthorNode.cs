using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchAuthorNode
{
    [JsonPropertyName("login")]
    public string Login { get; init; } = string.Empty;
}
