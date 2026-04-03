using System.Text.Json.Serialization;

namespace GhCli.Net.PullRequests.Models;

public class PullRequestAuthor
{
    [JsonPropertyName("login")]
    public string Login { get; init; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string AvatarUrl { get; init; } = string.Empty;
}
