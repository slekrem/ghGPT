using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiToolCallFunction
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("arguments")]
    public string? Arguments { get; set; }
}
