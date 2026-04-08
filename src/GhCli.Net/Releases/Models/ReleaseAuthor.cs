using System.Text.Json.Serialization;

namespace GhCli.Net.Releases.Models;

public record ReleaseAuthor
{
    [JsonPropertyName("login")] public string Login { get; init; } = string.Empty;
}
