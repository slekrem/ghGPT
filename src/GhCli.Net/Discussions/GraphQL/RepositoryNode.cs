using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.GraphQL;

internal class RepositoryNode
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("discussions")]
    public DiscussionConnection? Discussions { get; init; }

    [JsonPropertyName("discussionCategories")]
    public CategoryConnection? DiscussionCategories { get; init; }
}
