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
    string GetCombinedDiff(string id, string filePath);
    void StageFile(string id, string filePath);
    void UnstageFile(string id, string filePath);
    void StageAll(string id);
    void UnstageAll(string id);
    void StageLines(string id, string filePath, string patch);
    void UnstageLines(string id, string filePath, string patch);
    void Commit(string id, string message, string? description = null);
    Task FetchAsync(string id, IProgress<string>? progress = null);
    Task PullAsync(string id, IProgress<string>? progress = null);
    Task PushAsync(string id, IProgress<string>? progress = null);
    void Remove(string id);
    IReadOnlyList<BranchInfo> GetBranches(string id);
    void CheckoutBranch(string id, string branchName, CheckoutStrategy strategy = CheckoutStrategy.Normal, string? stashMessage = null);
    BranchInfo CreateBranch(string id, string name, string? startPoint = null);
    Task DeleteBranch(string id, string branchName);
    void RefreshCurrentBranch(string id);
    Task<RepositoryInfo> CreateAsync(string localPath, string name);
    Task<RepositoryInfo> ImportAsync(string localPath);
    Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null);
    IReadOnlyList<StashEntry> GetStashes(string id);
    IReadOnlyList<CommitFileChange> GetStashDiff(string id, int index);
    void PopStash(string id, int index = 0);
    void DropStash(string id, int index);
}
