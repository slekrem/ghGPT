using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class CategoryConnection
{
    [JsonPropertyName("nodes")]
    public List<CategoryNode> Nodes { get; init; } = [];
}
