using ghGPT.Core.Ai;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ghGPT.Ai;

internal sealed class ChatHistoryService : IChatHistoryService
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
        catch
        {
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

    private static void Save(string repoId, List<ChatHistoryEntry> entries)
    {
        Directory.CreateDirectory(HistoryDir);
        File.WriteAllText(GetPath(repoId), JsonSerializer.Serialize(entries, JsonOptions));
    }

    private static string GetPath(string repoId)
    {
        var safeId = string.Concat(repoId.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        return Path.Combine(HistoryDir, $"{safeId}.json");
    }
}
