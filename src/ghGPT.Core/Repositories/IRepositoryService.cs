namespace ghGPT.Core.Repositories;

public interface IRepositoryService
{
    IReadOnlyList<RepositoryInfo> GetAll();
    RepositoryInfo? GetActive();
    void SetActive(string id);
    Task<RepositoryInfo> CreateAsync(string localPath, string name);
    Task<RepositoryInfo> ImportAsync(string localPath);
    Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null);
}
