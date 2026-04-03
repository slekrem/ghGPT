using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class RepositoryData
{
    [JsonPropertyName("repository")]
    public RepositoryNode? Repository { get; init; }
}
