namespace ghGPT.Core.Ai;

public interface IChatHistoryService
{
    IReadOnlyList<ChatHistoryEntry> Load(string repoId);
    void Append(string repoId, string role, string content);
    void Clear(string repoId);
}
