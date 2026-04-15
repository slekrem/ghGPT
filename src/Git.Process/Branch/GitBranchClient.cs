using Git.Process.Abstractions;
using Git.Process.Branch.Models;
using Git.Process.Parsing;

namespace Git.Process.Branch;

internal class GitBranchClient(IGitRunner runner) : IGitBranchClient
{
    private const string BranchFormat = "%(refname)%09%(HEAD)%09%(upstream:short)%09%(upstream:track,nobracket)";

    public async Task<IReadOnlyList<GitBranchEntry>> GetBranchesAsync(string repoPath)
    {
        var output = await runner.RunAsync(repoPath, "for-each-ref", $"--format={BranchFormat}", "refs/heads", "refs/remotes");
        return BranchParser.Parse(output);
    }

    public async Task<string> GetCurrentBranchAsync(string repoPath)
    {
        var output = await runner.RunAsync(repoPath, "rev-parse", "--abbrev-ref", "HEAD");
        return output.Trim();
    }

    public Task CheckoutAsync(string repoPath, string branchName) =>
        runner.RunAsync(repoPath, "checkout", branchName);

    public Task CheckoutNewTrackingBranchAsync(string repoPath, string localName, string remoteBranch) =>
        runner.RunAsync(repoPath, "checkout", "-b", localName, "--track", remoteBranch);

    public async Task CreateBranchAsync(string repoPath, string name, string? startPoint)
    {
        var args = new List<string> { "checkout", "-b", name };
        if (!string.IsNullOrWhiteSpace(startPoint))
            args.Add(startPoint);

        await runner.RunAsync(repoPath, [.. args]);
    }

    public async Task<bool> BranchExistsAsync(string repoPath, string name)
    {
        try
        {
            var output = await runner.RunAsync(repoPath, "show-ref", "--verify", "--quiet", $"refs/heads/{name}");
            return true;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    public async Task<bool> IsRemoteBranchAsync(string repoPath, string branchName)
    {
        try
        {
            await runner.RunAsync(repoPath, "show-ref", "--verify", "--quiet", $"refs/remotes/{branchName}");
            return true;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    public async Task<string?> GetRemoteForBranchAsync(string repoPath, string remoteBranchName)
    {
        // remoteBranchName is e.g. "origin/feature-x" — first segment is the remote name
        var slashIndex = remoteBranchName.IndexOf('/');
        if (slashIndex <= 0) return null;

        var remoteName = remoteBranchName[..slashIndex];
        try
        {
            var remotes = await runner.RunAsync(repoPath, "remote");
            return remotes.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(r => r.Trim())
                .FirstOrDefault(r => r == remoteName);
        }
        catch (InvalidOperationException)
        {
            return null;
        }
    }

    public Task DeleteLocalBranchAsync(string repoPath, string branchName) =>
        runner.RunAsync(repoPath, "branch", "-D", branchName);

    public Task DeleteRemoteBranchAsync(string repoPath, string remoteName, string branchName, IProgress<string>? progress) =>
        runner.RunWithProgressAsync(repoPath, progress, "push", remoteName, "--delete", branchName);

    public async Task<bool> HasUncommittedChangesAsync(string repoPath)
    {
        var output = await runner.RunAsync(repoPath, "status", "--porcelain=v1");
        return !string.IsNullOrWhiteSpace(output);
    }

    public Task StashAsync(string repoPath, string message) =>
        runner.RunAsync(repoPath, "stash", "push", "-u", "-m", message);

    public Task ResetHardAsync(string repoPath) =>
        runner.RunAsync(repoPath, "reset", "--hard", "HEAD");

    public Task CleanUntrackedAsync(string repoPath) =>
        runner.RunAsync(repoPath, "clean", "-fd");
}
