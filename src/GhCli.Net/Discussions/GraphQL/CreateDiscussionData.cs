using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class CreateDiscussionData
{
    [JsonPropertyName("createDiscussion")]
    public CreateDiscussionPayload? CreateDiscussion { get; init; }
}
