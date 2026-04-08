using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class LinkedBranchQueryData
{
    [JsonPropertyName("repository")]
    public LinkedBranchRepositoryNode? Repository { get; init; }
}
