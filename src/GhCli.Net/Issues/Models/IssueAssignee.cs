using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.Models;

public record IssueAssignee
{
    [JsonPropertyName("login")] public string Login { get; init; } = string.Empty;
}
