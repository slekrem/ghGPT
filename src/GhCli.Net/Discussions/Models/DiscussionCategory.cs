using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.Models;

public class DiscussionCategory
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;
}
