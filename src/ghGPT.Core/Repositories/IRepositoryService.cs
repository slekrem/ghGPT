namespace ghGPT.Core.Repositories;

public interface IRepositoryService
{
    IReadOnlyList<RepositoryInfo> GetAll();
    RepositoryInfo? GetActive();
    void SetActive(string id);
    RepositoryStatusResult GetStatus(string id);
    string GetDiff(string id, string filePath, bool staged);
    void StageFile(string id, string filePath);
    void UnstageFile(string id, string filePath);
    void StageAll(string id);
    void UnstageAll(string id);
    void Remove(string id);
    Task<RepositoryInfo> CreateAsync(string localPath, string name);
    Task<RepositoryInfo> ImportAsync(string localPath);
    Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null);
}
