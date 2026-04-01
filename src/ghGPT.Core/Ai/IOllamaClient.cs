namespace ghGPT.Core.Ai;

public interface IOllamaClient
{
    Task<bool> IsAvailableAsync();
    Task<IReadOnlyList<OllamaModelInfo>> GetModelsAsync();
    IAsyncEnumerable<string> GenerateAsync(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken = default);
}
