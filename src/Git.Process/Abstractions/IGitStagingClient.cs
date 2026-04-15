namespace Git.Process.Abstractions;

public interface IGitStagingClient
{
    Task StageFileAsync(string repoPath, string filePath);
    Task UnstageFileAsync(string repoPath, string filePath);
    Task StageAllAsync(string repoPath);
    Task UnstageAllAsync(string repoPath);
    Task ApplyPatchAsync(string repoPath, string patch, bool cached, bool reverse);
    Task<bool> ExistsInHeadAsync(string repoPath, string filePath);
    Task RestoreFromHeadAsync(string repoPath, string filePath);
}
