namespace ghGPT.Core.Ai;

public interface IChatContextBuilder
{
    Task<IEnumerable<ChatMessage>> BuildAsync(ChatRequest request);
}
