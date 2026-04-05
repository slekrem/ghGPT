using System.Text.Json.Serialization;

namespace GhCli.Net.PullRequests.Models;

public class PullRequestStatusCheck
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; init; } = string.Empty;

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; init; }
}
