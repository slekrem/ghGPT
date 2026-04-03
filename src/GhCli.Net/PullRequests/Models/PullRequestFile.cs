using System.Text.Json.Serialization;

namespace GhCli.Net.PullRequests.Models;

public class PullRequestFile
{
    [JsonPropertyName("path")]
    public string Path { get; init; } = string.Empty;

    [JsonPropertyName("additions")]
    public int Additions { get; init; }

    [JsonPropertyName("deletions")]
    public int Deletions { get; init; }

    [JsonPropertyName("changeType")]
    public string ChangeType { get; init; } = string.Empty;

    public int Changes => Additions + Deletions;
}
