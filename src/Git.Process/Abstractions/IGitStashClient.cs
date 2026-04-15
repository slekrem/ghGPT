using Git.Process.Repository.Models;
using Git.Process.Stash.Models;

namespace Git.Process.Abstractions;

public interface IGitStashClient
{
    Task<IReadOnlyList<GitStashEntry>> GetStashesAsync(string repoPath);
    Task<IReadOnlyList<GitCommitFileChange>> GetStashDiffAsync(string repoPath, int index);
    Task PushStashAsync(string repoPath, string? message, string[]? paths);
    Task PopStashAsync(string repoPath, int index);
    Task DropStashAsync(string repoPath, int index);
}
