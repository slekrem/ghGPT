using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class IssueRepositoryData
{
    [JsonPropertyName("repository")]
    public IssueRepositoryNode? Repository { get; init; }
}
