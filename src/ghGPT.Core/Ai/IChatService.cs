namespace ghGPT.Core.Ai;

public interface IChatService
{
    IAsyncEnumerable<ChatEvent> StreamAsync(ChatRequest request, CancellationToken cancellationToken = default);
}
