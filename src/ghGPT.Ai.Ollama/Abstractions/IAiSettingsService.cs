namespace ghGPT.Ai.Ollama;

public interface IAiSettingsService
{
    OllamaSettings Load();
    void Save(OllamaSettings settings);
}
