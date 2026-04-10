using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiCompletion
{
    [JsonPropertyName("choices")]
    public List<OpenAiCompletionChoice>? Choices { get; set; }
}
