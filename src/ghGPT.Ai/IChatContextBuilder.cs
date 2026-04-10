using ghGPT.Ai.Abstractions;

namespace ghGPT.Ai;

internal interface IChatContextBuilder
{
    Task<IEnumerable<ChatMessage>> BuildAsync(ChatRequest request);
}
