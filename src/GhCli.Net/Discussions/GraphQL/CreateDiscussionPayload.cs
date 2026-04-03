using GhCli.Net.Discussions.Models;
using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class CreateDiscussionPayload
{
    [JsonPropertyName("discussion")]
    public Discussion? Discussion { get; init; }
}
