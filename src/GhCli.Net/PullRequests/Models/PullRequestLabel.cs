using System.Text.Json.Serialization;

namespace GhCli.Net.PullRequests.Models;

public class PullRequestLabel
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;
}
