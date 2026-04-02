namespace ghGPT.Core.Ai;

public interface IChatHistoryService
{
    IReadOnlyList<ChatHistoryEntry> Load(string repoId);
    void Append(string repoId, string role, string content);
    void Clear(string repoId);
}

public class ChatHistoryEntry
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
}
