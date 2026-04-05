using System.Text.Json.Serialization;

namespace GhCli.Net.User.Models;

public record GitHubUser
{
    [JsonPropertyName("login")] public string Login { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string? Name { get; init; }
    [JsonPropertyName("email")] public string? Email { get; init; }
    [JsonPropertyName("bio")] public string? Bio { get; init; }
    [JsonPropertyName("company")] public string? Company { get; init; }
    [JsonPropertyName("location")] public string? Location { get; init; }
    [JsonPropertyName("html_url")] public string Url { get; init; } = string.Empty;
    [JsonPropertyName("avatar_url")] public string AvatarUrl { get; init; } = string.Empty;
    [JsonPropertyName("public_repos")] public int PublicRepos { get; init; }
    [JsonPropertyName("followers")] public int Followers { get; init; }
    [JsonPropertyName("following")] public int Following { get; init; }
    [JsonPropertyName("created_at")] public DateTimeOffset CreatedAt { get; init; }
}
