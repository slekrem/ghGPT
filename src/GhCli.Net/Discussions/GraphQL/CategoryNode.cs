using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class CategoryNode
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;
}
