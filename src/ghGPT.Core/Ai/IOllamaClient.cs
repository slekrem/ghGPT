namespace ghGPT.Core.Ai;

public interface IOllamaClient
{
    Task<bool> IsAvailableAsync();
    Task<IReadOnlyList<OllamaModelInfo>> GetModelsAsync();
    IAsyncEnumerable<string> GenerateAsync(string prompt, CancellationToken cancellationToken = default);
}
