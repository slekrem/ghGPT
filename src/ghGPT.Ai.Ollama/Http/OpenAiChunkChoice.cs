using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiChunkChoice
{
    [JsonPropertyName("delta")]
    public OpenAiDelta? Delta { get; set; }
}
