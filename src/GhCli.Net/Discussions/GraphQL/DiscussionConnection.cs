using GhCli.Net.Discussions.Models;
using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class DiscussionConnection
{
    [JsonPropertyName("nodes")]
    public List<Discussion> Nodes { get; init; } = [];
}
