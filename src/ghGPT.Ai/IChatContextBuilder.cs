using ghGPT.Ai.Ollama;
using ghGPT.Core.Ai;

namespace ghGPT.Ai;

internal interface IChatContextBuilder
{
    Task<IEnumerable<ChatMessage>> BuildAsync(ChatRequest request);
}
