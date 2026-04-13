using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiDelta
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
