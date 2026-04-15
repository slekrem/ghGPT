using Git.Process.Repository.Models;

namespace Git.Process.Abstractions;

public interface IGitRepositoryClient
{
    Task InitAsync(string repoPath);
    Task<bool> IsValidRepositoryAsync(string repoPath);
    Task CloneAsync(string remoteUrl, string targetDirectory, IProgress<string>? progress);
    Task<GitStatusResult> GetStatusAsync(string repoPath);
    Task<IReadOnlyList<GitCommitEntry>> GetHistoryAsync(string repoPath, int limit = 50);
    Task<GitCommitListResult> GetCommitsAsync(string repoPath, string? branch, int skip, int take);
    Task<GitCommitDetail> GetCommitDetailAsync(string repoPath, string sha);
    Task<string> GetDiffAsync(string repoPath, string filePath, bool staged);
    Task<string> GetCombinedDiffAsync(string repoPath, string filePath);
    Task CommitAsync(string repoPath, string message);
    Task FetchAsync(string repoPath, IProgress<string>? progress);
    Task PullAsync(string repoPath, IProgress<string>? progress);
    Task PushAsync(string repoPath, IProgress<string>? progress);
}
