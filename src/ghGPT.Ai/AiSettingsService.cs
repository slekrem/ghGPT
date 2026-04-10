using ghGPT.Ai.Abstractions;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ghGPT.Ai;

internal sealed class AiSettingsService(ILogger<AiSettingsService> logger) : IAiSettingsService
{
    private static readonly string SettingsFilePath =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ghGPT", "ai-settings.json");

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public AiSettings Load()
    {
        if (!File.Exists(SettingsFilePath))
            return new AiSettings();

        try
        {
            var json = File.ReadAllText(SettingsFilePath);
            return JsonSerializer.Deserialize<AiSettings>(json) ?? new AiSettings();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AI-Einstellungen konnten nicht geladen werden, Standardwerte werden verwendet.");
            return new AiSettings();
        }
    }

    public void Save(AiSettings settings)
    {
        var directory = Path.GetDirectoryName(SettingsFilePath)!;
        Directory.CreateDirectory(directory);
        File.WriteAllText(SettingsFilePath, JsonSerializer.Serialize(settings, JsonOptions));
    }
}
