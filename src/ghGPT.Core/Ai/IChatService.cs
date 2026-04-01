namespace ghGPT.Core.Ai;

public interface IChatService
{
    IAsyncEnumerable<string> StreamAsync(ChatRequest request, CancellationToken cancellationToken = default);
}
