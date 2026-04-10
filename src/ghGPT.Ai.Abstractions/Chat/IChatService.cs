namespace ghGPT.Ai.Abstractions;

public interface IChatService
{
    IAsyncEnumerable<ChatEvent> StreamAsync(ChatRequest request, CancellationToken cancellationToken = default);
}
