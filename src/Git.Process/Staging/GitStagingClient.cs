using Git.Process.Abstractions;
using System.Text;

namespace Git.Process.Staging;

internal class GitStagingClient(IGitRunner runner) : IGitStagingClient
{
    public Task StageFileAsync(string repoPath, string filePath) =>
        runner.RunAsync(repoPath, "add", "--", filePath);

    public async Task UnstageFileAsync(string repoPath, string filePath)
    {
        try
        {
            await runner.RunAsync(repoPath, "restore", "--staged", "--", filePath);
        }
        catch (InvalidOperationException)
        {
            // No initial commit yet — git restore --staged requires HEAD
            await runner.RunAsync(repoPath, "rm", "--cached", "--", filePath);
        }
    }

    public Task StageAllAsync(string repoPath) =>
        runner.RunAsync(repoPath, "add", "-A");

    public Task UnstageAllAsync(string repoPath) =>
        runner.RunAsync(repoPath, "restore", "--staged", ".");

    public async Task ApplyPatchAsync(string repoPath, string patch, bool cached, bool reverse)
    {
        var tempFile = Path.GetTempFileName();
        try
        {
            await File.WriteAllTextAsync(tempFile, patch, Encoding.UTF8);

            var args = new List<string> { "apply" };
            if (cached) args.Add("--cached");
            if (reverse) args.Add("--reverse");
            args.Add("--");
            args.Add(tempFile);

            await runner.RunAsync(repoPath, [.. args]);
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    public async Task<bool> ExistsInHeadAsync(string repoPath, string filePath)
    {
        try
        {
            var output = await runner.RunAsync(repoPath, "ls-tree", "HEAD", "--", filePath);
            return !string.IsNullOrWhiteSpace(output);
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    public Task RestoreFromHeadAsync(string repoPath, string filePath) =>
        runner.RunAsync(repoPath, "restore", "--source=HEAD", "--staged", "--worktree", "--", filePath);
}
