using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiChunk
{
    [JsonPropertyName("choices")]
    public List<OpenAiChunkChoice>? Choices { get; set; }
}
