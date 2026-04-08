using System.Text.Json.Serialization;

namespace GhCli.Net.Releases.Models;

public record Release
{
    [JsonPropertyName("tagName")] public string TagName { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("isDraft")] public bool IsDraft { get; init; }
    [JsonPropertyName("isPrerelease")] public bool IsPrerelease { get; init; }
    [JsonPropertyName("isLatest")] public bool IsLatest { get; init; }
    [JsonPropertyName("publishedAt")] public DateTimeOffset PublishedAt { get; init; }
    [JsonPropertyName("url")] public string Url { get; init; } = string.Empty;
}
