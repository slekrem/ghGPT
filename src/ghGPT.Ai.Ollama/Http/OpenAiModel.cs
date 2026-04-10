using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("created")]
    public long Created { get; set; }
}
