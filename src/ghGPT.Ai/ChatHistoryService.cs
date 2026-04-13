using ghGPT.Ai.Abstractions;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ghGPT.Ai;

internal sealed class ChatHistoryService(ILogger<ChatHistoryService> logger) : IChatHistoryService
{
    private static readonly string HistoryDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ghGPT", "history");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public IReadOnlyList<ChatHistoryEntry> Load(string repoId)
    {
        var path = GetPath(repoId);
        if (!File.Exists(path)) return [];

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<List<ChatHistoryEntry>>(json, JsonOptions) ?? [];
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Chat-History konnte nicht geladen werden für Repo {RepoId}.", repoId);
            return [];
        }
    }

    public void Append(string repoId, string role, string content)
    {
        var entries = Load(repoId).ToList();
        entries.Add(new ChatHistoryEntry
        {
            Role = role,
            Content = content,
            Timestamp = DateTimeOffset.UtcNow
        });
        Save(repoId, entries);
    }

    public void Clear(string repoId)
    {
        var path = GetPath(repoId);
        if (File.Exists(path))
            File.Delete(path);
    }

    private void Save(string repoId, List<ChatHistoryEntry> entries)
    {
        try
        {
            Directory.CreateDirectory(HistoryDir);
            File.WriteAllText(GetPath(repoId), JsonSerializer.Serialize(entries, JsonOptions));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Chat-History konnte nicht gespeichert werden für Repo {RepoId}.", repoId);
        }
    }

    private static string GetPath(string repoId)
    {
        var safeId = string.Concat(repoId.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        return Path.Combine(HistoryDir, $"{safeId}.json");
    }
}
