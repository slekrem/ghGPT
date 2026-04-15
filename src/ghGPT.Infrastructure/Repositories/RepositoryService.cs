using ghGPT.Core.Repositories;
using Git.Process.Abstractions;
using Git.Process.Repository.Models;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryService(
    RepositoryRegistry registry,
    IGitRepositoryClient git,
    IGitBranchClient branchClient) : IRepositoryService
{
    public IReadOnlyList<RepositoryInfo> GetAll() => registry.GetAll();

    public RepositoryInfo? GetActive() => registry.GetActive();

    public void SetActive(string id) => registry.SetActive(id);

    public async Task<RepositoryInfo> CreateAsync(string localPath, string name)
    {
        await git.InitAsync(localPath);
        var info = await registry.BuildInfoAsync(localPath);
        registry.Add(info);
        return info;
    }

    public async Task<RepositoryInfo> ImportAsync(string localPath)
    {
        if (!await git.IsValidRepositoryAsync(localPath))
            throw new InvalidOperationException($"'{localPath}' ist kein gültiges Git-Repository.");

        if (registry.GetAll().Any(r => r.LocalPath == localPath))
            throw new InvalidOperationException($"Repository '{localPath}' ist bereits importiert.");

        var info = await registry.BuildInfoAsync(localPath);
        registry.Add(info);
        return info;
    }

    public async Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null)
    {
        var repoName = Path.GetFileNameWithoutExtension(remoteUrl.TrimEnd('/').Split('/').Last());
        var targetPath = Path.Combine(localPath, repoName);

        if (Directory.Exists(targetPath))
            throw new InvalidOperationException($"'{targetPath}' existiert bereits.");

        await git.CloneAsync(remoteUrl, targetPath, progress);

        var info = await registry.BuildInfoAsync(targetPath);
        registry.Add(info);
        return info;
    }

    public RepositoryStatusResult GetStatus(string id)
    {
        var info = registry.GetById(id);
        var result = git.GetStatusAsync(info.LocalPath).GetAwaiter().GetResult();
        return new RepositoryStatusResult
        {
            Staged = result.Staged.Select(MapStatusEntry).ToList(),
            Unstaged = result.Unstaged.Select(MapStatusEntry).ToList()
        };
    }

    public IReadOnlyList<CommitHistoryEntry> GetHistory(string id, int limit = 50)
    {
        var info = registry.GetById(id);
        var entries = git.GetHistoryAsync(info.LocalPath, limit).GetAwaiter().GetResult();
        return entries.Select(MapHistoryEntry).ToList();
    }

    public CommitListResult GetCommits(string id, string? branch = null, int skip = 0, int take = 100)
    {
        var info = registry.GetById(id);
        var result = git.GetCommitsAsync(info.LocalPath, branch, skip, take).GetAwaiter().GetResult();
        return new CommitListResult
        {
            Branch = result.Branch,
            Commits = result.Commits.Select(MapCommitListItem).ToList(),
            HasMore = result.HasMore
        };
    }

    public CommitDetail GetCommitDetail(string id, string sha)
    {
        var info = registry.GetById(id);
        var detail = git.GetCommitDetailAsync(info.LocalPath, sha).GetAwaiter().GetResult();
        return new CommitDetail
        {
            Sha = detail.Sha,
            ShortSha = detail.Sha[..7],
            Message = detail.Message,
            FullMessage = detail.FullMessage,
            AuthorName = detail.AuthorName,
            AuthorEmail = detail.AuthorEmail,
            AuthorDate = detail.AuthorDate,
            Files = detail.Files.Select(MapFileChange).ToList()
        };
    }

    public string GetDiff(string id, string filePath, bool staged)
    {
        var info = registry.GetById(id);
        return git.GetDiffAsync(info.LocalPath, filePath, staged).GetAwaiter().GetResult();
    }

    public string GetCombinedDiff(string id, string filePath)
    {
        var info = registry.GetById(id);
        return git.GetCombinedDiffAsync(info.LocalPath, filePath).GetAwaiter().GetResult();
    }

    public void Commit(string id, string message, string? description = null)
    {
        var info = registry.GetById(id);

        var status = git.GetStatusAsync(info.LocalPath).GetAwaiter().GetResult();
        if (status.Staged.Count == 0)
            throw new InvalidOperationException("Keine gestagten Änderungen vorhanden.");

        var fullMessage = string.IsNullOrWhiteSpace(description)
            ? message
            : $"{message}\n\n{description}";

        git.CommitAsync(info.LocalPath, fullMessage).GetAwaiter().GetResult();
    }

    public Task FetchAsync(string id, IProgress<string>? progress = null) =>
        git.FetchAsync(registry.GetById(id).LocalPath, progress);

    public Task PullAsync(string id, IProgress<string>? progress = null) =>
        git.PullAsync(registry.GetById(id).LocalPath, progress);

    public Task PushAsync(string id, IProgress<string>? progress = null) =>
        git.PushAsync(registry.GetById(id).LocalPath, progress);

    public void Remove(string id) => registry.Remove(id);

    public void RefreshCurrentBranch(string id)
    {
        var info = registry.GetById(id);
        info.CurrentBranch = branchClient.GetCurrentBranchAsync(info.LocalPath).GetAwaiter().GetResult();
    }

    private static FileStatusEntry MapStatusEntry(GitStatusEntry entry) => new()
    {
        FilePath = entry.FilePath,
        Status = entry.Status,
        IsStaged = entry.IsStaged
    };

    private static CommitHistoryEntry MapHistoryEntry(GitCommitEntry entry) => new()
    {
        Sha = entry.Sha,
        ShortSha = entry.Sha[..7],
        Message = entry.Message,
        AuthorName = entry.AuthorName,
        AuthorEmail = entry.AuthorEmail,
        AuthorDate = entry.AuthorDate
    };

    private static CommitListItem MapCommitListItem(GitCommitEntry entry) => new()
    {
        Sha = entry.Sha,
        ShortSha = entry.Sha[..7],
        Message = entry.Message,
        AuthorName = entry.AuthorName,
        AuthorEmail = entry.AuthorEmail,
        AuthorDate = entry.AuthorDate
    };

    private static CommitFileChange MapFileChange(GitCommitFileChange change) => new()
    {
        Path = change.Path,
        OldPath = change.OldPath,
        Status = change.Status,
        Additions = change.Additions,
        Deletions = change.Deletions,
        Patch = change.Patch
    };
}
