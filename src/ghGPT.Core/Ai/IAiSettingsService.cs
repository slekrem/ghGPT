namespace ghGPT.Core.Ai;

public interface IAiSettingsService
{
    OllamaSettings Load();
    void Save(OllamaSettings settings);
}
