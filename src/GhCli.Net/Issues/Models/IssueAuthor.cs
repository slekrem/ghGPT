using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.Models;

public record IssueAuthor
{
    [JsonPropertyName("login")] public string Login { get; init; } = string.Empty;
}
