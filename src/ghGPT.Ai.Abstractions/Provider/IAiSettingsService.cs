namespace ghGPT.Ai.Abstractions;

public interface IAiSettingsService
{
    AiSettings Load();
    void Save(AiSettings settings);
}
