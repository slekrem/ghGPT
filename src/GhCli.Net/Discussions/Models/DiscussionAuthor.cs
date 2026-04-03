using System.Text.Json.Serialization;

namespace GhCli.Net.Discussions.Models;

public class DiscussionAuthor
{
    [JsonPropertyName("login")]
    public string Login { get; init; } = string.Empty;
}
