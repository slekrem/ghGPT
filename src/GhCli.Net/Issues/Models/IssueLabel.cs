using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.Models;

public record IssueLabel
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("color")] public string Color { get; init; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; init; }
}
