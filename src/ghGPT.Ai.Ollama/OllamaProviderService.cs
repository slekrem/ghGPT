using ghGPT.Ai.Abstractions;

namespace ghGPT.Ai.Ollama;

internal sealed class OllamaProviderService(
    IOllamaClient ollamaClient,
    IAiSettingsService settingsService) : IAiProviderService
{
    public async Task<AiStatus> GetStatusAsync()
    {
        var settings = settingsService.Load();
        var online = await ollamaClient.IsAvailableAsync();

        return new AiStatus
        {
            Online = online,
            BaseUrl = settings.BaseUrl,
            Model = settings.Model
        };
    }

    public async Task<IReadOnlyList<AiModelInfo>> GetModelsAsync()
    {
        return await ollamaClient.GetModelsAsync();
    }
}
