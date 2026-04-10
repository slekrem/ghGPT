using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OpenAiCompletionChoice
{
    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }

    [JsonPropertyName("message")]
    public OpenAiMessage? Message { get; set; }
}
