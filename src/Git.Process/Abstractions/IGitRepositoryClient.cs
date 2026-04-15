using Git.Process.Repository.Models;

namespace Git.Process.Abstractions;

public interface IGitRepositoryClient
{
    Task<GitStatusResult> GetStatusAsync(string repoPath);
}
