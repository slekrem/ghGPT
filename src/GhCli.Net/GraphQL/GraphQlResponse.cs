using System.Text.Json.Serialization;

namespace GhCli.Net.GraphQL;

internal class GraphQlResponse<T>
{
    [JsonPropertyName("data")]
    public T? Data { get; init; }

    [JsonPropertyName("errors")]
    public GraphQlError[]? Errors { get; init; }

    public bool HasErrors => Errors is { Length: > 0 };
}

internal class GraphQlError
{
    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;
}
