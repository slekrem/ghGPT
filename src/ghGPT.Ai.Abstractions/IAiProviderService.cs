namespace ghGPT.Ai.Abstractions;

public interface IAiProviderService
{
    Task<AiStatus> GetStatusAsync();
    Task<IReadOnlyList<AiModelInfo>> GetModelsAsync();
}
