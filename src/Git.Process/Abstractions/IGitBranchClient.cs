using Git.Process.Branch.Models;

namespace Git.Process.Abstractions;

public interface IGitBranchClient
{
    Task<IReadOnlyList<GitBranchEntry>> GetBranchesAsync(string repoPath);
    Task<string> GetCurrentBranchAsync(string repoPath);
    Task CheckoutAsync(string repoPath, string branchName);
    Task CheckoutNewTrackingBranchAsync(string repoPath, string localName, string remoteBranch);
    Task CreateBranchAsync(string repoPath, string name, string? startPoint);
    Task<bool> BranchExistsAsync(string repoPath, string name);
    Task<bool> IsRemoteBranchAsync(string repoPath, string branchName);
    Task<string?> GetRemoteForBranchAsync(string repoPath, string remoteBranchName);
    Task DeleteLocalBranchAsync(string repoPath, string branchName);
    Task DeleteRemoteBranchAsync(string repoPath, string remoteName, string branchName, IProgress<string>? progress);
    Task<bool> HasUncommittedChangesAsync(string repoPath);
    Task StashAsync(string repoPath, string message);
    Task ResetHardAsync(string repoPath);
    Task CleanUntrackedAsync(string repoPath);
}
