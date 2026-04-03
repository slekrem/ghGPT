namespace ghGPT.Core.Ai;

public interface IOllamaClient
{
    Task<bool> IsAvailableAsync();
    Task<IReadOnlyList<OllamaModelInfo>> GetModelsAsync();
    IAsyncEnumerable<string> GenerateAsync(IEnumerable<ChatMessage> messages, CancellationToken cancellationToken = default);
    Task<ToolCallResponse> CompleteWithToolsAsync(IEnumerable<ChatMessage> messages, IEnumerable<ToolDefinition> tools, CancellationToken cancellationToken = default);
}
