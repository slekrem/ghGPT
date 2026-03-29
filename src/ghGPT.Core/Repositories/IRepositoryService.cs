namespace ghGPT.Core.Repositories;

public interface IRepositoryService
{
    IReadOnlyList<RepositoryInfo> GetAll();
    RepositoryInfo? GetActive();
    void SetActive(string id);
    RepositoryStatusResult GetStatus(string id);
    CommitListResult GetCommits(string id, string? branch = null, int skip = 0, int take = 100);
    CommitDetail GetCommitDetail(string id, string sha);
    IReadOnlyList<CommitHistoryEntry> GetHistory(string id, int limit = 50);
    string GetDiff(string id, string filePath, bool staged);
    void StageFile(string id, string filePath);
    void UnstageFile(string id, string filePath);
    void StageAll(string id);
    void UnstageAll(string id);
    void Commit(string id, string message, string? description = null);
    void Remove(string id);
    Task<RepositoryInfo> CreateAsync(string localPath, string name);
    Task<RepositoryInfo> ImportAsync(string localPath);
    Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null);
}
