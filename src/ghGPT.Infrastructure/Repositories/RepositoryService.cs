using ghGPT.Core.Repositories;
using LibGit2Sharp;
using System.Diagnostics;
using System.Text;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryService(RepositoryRegistry registry) : IRepositoryService
{
    public IReadOnlyList<RepositoryInfo> GetAll() => registry.GetAll();

    public RepositoryInfo? GetActive() => registry.GetActive();

    public void SetActive(string id) => registry.SetActive(id);

    public Task<RepositoryInfo> CreateAsync(string localPath, string name)
    {
        Directory.CreateDirectory(localPath);
        LibGit2Sharp.Repository.Init(localPath);

        var info = RepositoryRegistry.BuildInfo(localPath);
        registry.Add(info);
        return Task.FromResult(info);
    }

    public Task<RepositoryInfo> ImportAsync(string localPath)
    {
        if (!LibGit2Sharp.Repository.IsValid(localPath))
            throw new InvalidOperationException($"'{localPath}' ist kein gültiges Git-Repository.");

        if (registry.GetAll().Any(r => r.LocalPath == localPath))
            throw new InvalidOperationException($"Repository '{localPath}' ist bereits importiert.");

        var info = RepositoryRegistry.BuildInfo(localPath);
        registry.Add(info);
        return Task.FromResult(info);
    }

    public Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null)
    {
        var repoName = Path.GetFileNameWithoutExtension(remoteUrl.TrimEnd('/').Split('/').Last());
        localPath = Path.Combine(localPath, repoName);

        if (Directory.Exists(localPath))
            throw new InvalidOperationException($"'{localPath}' existiert bereits.");

        var options = new CloneOptions();

        if (progress is not null)
        {
            options.OnCheckoutProgress = (path, completed, total) =>
                progress.Report($"Checkout: {path} ({completed}/{total})");

            options.FetchOptions.OnProgress = message =>
            {
                progress.Report(message);
                return true;
            };

            options.FetchOptions.OnTransferProgress = transferProgress =>
            {
                progress.Report(
                    $"Objekte empfangen: {transferProgress.ReceivedObjects}/{transferProgress.TotalObjects}");
                return true;
            };
        }

        LibGit2Sharp.Repository.Clone(remoteUrl, localPath, options);

        var info = RepositoryRegistry.BuildInfo(localPath);
        registry.Add(info);
        return Task.FromResult(info);
    }

    public RepositoryStatusResult GetStatus(string id)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        var status = repo.RetrieveStatus();

        var staged = new List<FileStatusEntry>();
        var unstaged = new List<FileStatusEntry>();

        foreach (var entry in status)
        {
            var state = entry.State;

            if (state.HasFlag(FileStatus.NewInIndex))
                staged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Added", IsStaged = true });
            if (state.HasFlag(FileStatus.ModifiedInIndex))
                staged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Modified", IsStaged = true });
            if (state.HasFlag(FileStatus.DeletedFromIndex))
                staged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Deleted", IsStaged = true });
            if (state.HasFlag(FileStatus.RenamedInIndex))
                staged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Renamed", IsStaged = true });

            if (state.HasFlag(FileStatus.ModifiedInWorkdir))
                unstaged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Modified", IsStaged = false });
            if (state.HasFlag(FileStatus.DeletedFromWorkdir))
                unstaged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Deleted", IsStaged = false });
            if (state.HasFlag(FileStatus.NewInWorkdir))
                unstaged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Untracked", IsStaged = false });
            if (state.HasFlag(FileStatus.RenamedInWorkdir))
                unstaged.Add(new FileStatusEntry { FilePath = entry.FilePath, Status = "Renamed", IsStaged = false });
        }

        return new RepositoryStatusResult { Staged = staged, Unstaged = unstaged };
    }

    public IReadOnlyList<CommitHistoryEntry> GetHistory(string id, int limit = 50)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        return repo.Commits
            .Take(limit)
            .Select(commit => new CommitHistoryEntry
            {
                Sha = commit.Sha,
                ShortSha = commit.Sha[..7],
                Message = commit.MessageShort,
                AuthorName = commit.Author.Name,
                AuthorEmail = commit.Author.Email,
                AuthorDate = commit.Author.When
            })
            .ToList();
    }

    public CommitListResult GetCommits(string id, string? branch = null, int skip = 0, int take = 100)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var branchName = string.IsNullOrWhiteSpace(branch) ? repo.Head.FriendlyName : branch;
        var selectedBranch = repo.Branches[branchName]
            ?? throw new InvalidOperationException($"Branch '{branchName}' nicht gefunden.");

        var filter = new CommitFilter
        {
            IncludeReachableFrom = selectedBranch,
            SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Time
        };
        var commits = repo.Commits.QueryBy(filter)
            .Skip(Math.Max(skip, 0))
            .Take(Math.Max(take, 1) + 1)
            .Select(MapCommitListItem)
            .ToList();

        var hasMore = commits.Count > Math.Max(take, 1);
        if (hasMore)
            commits.RemoveAt(commits.Count - 1);

        return new CommitListResult
        {
            Branch = selectedBranch.FriendlyName,
            Commits = commits,
            HasMore = hasMore
        };
    }

    public CommitDetail GetCommitDetail(string id, string sha)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var commit = repo.Lookup<Commit>(sha)
            ?? throw new InvalidOperationException($"Commit '{sha}' nicht gefunden.");

        var parentTree = commit.Parents.FirstOrDefault()?.Tree;
        var patch = repo.Diff.Compare<Patch>(parentTree, commit.Tree);

        return new CommitDetail
        {
            Sha = commit.Sha,
            ShortSha = commit.Sha[..7],
            Message = commit.MessageShort,
            FullMessage = commit.Message,
            AuthorName = commit.Author.Name,
            AuthorEmail = commit.Author.Email,
            AuthorDate = commit.Author.When,
            Files = patch.Select(entry => new CommitFileChange
            {
                Path = entry.Path,
                OldPath = entry.OldPath,
                Status = entry.Status.ToString(),
                Additions = entry.LinesAdded,
                Deletions = entry.LinesDeleted,
                Patch = entry.Patch
            }).ToList()
        };
    }

    public string GetDiff(string id, string filePath, bool staged)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        if (!staged && IsUntrackedFile(repo, filePath))
            return BuildUntrackedFileDiff(info.LocalPath, filePath);

        Patch patch;
        if (staged)
        {
            var headTree = repo.Head.Tip?.Tree;
            patch = repo.Diff.Compare<Patch>(headTree, DiffTargets.Index, [filePath]);
        }
        else
        {
            patch = repo.Diff.Compare<Patch>([filePath]);
        }

        return string.Concat(patch.Select(e => e.Patch));
    }

    public string GetCombinedDiff(string id, string filePath)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        if (IsUntrackedFile(repo, filePath))
            return BuildUntrackedFileDiff(info.LocalPath, filePath);

        var psi = new ProcessStartInfo("git", $"diff HEAD -- \"{filePath}\"")
        {
            WorkingDirectory = info.LocalPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException("Git-Prozess konnte nicht gestartet werden.");
        var output = process.StandardOutput.ReadToEnd();
        var error = process.StandardError.ReadToEnd();
        process.WaitForExit();

        if (process.ExitCode != 0)
            throw new InvalidOperationException(
                $"Diff konnte nicht geladen werden: {error.Trim()}");

        return output.Replace("\r\n", "\n");
    }

    public void Commit(string id, string message, string? description = null)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var hasStagedChanges = repo.RetrieveStatus().Any(e =>
            e.State.HasFlag(FileStatus.NewInIndex) ||
            e.State.HasFlag(FileStatus.ModifiedInIndex) ||
            e.State.HasFlag(FileStatus.DeletedFromIndex) ||
            e.State.HasFlag(FileStatus.RenamedInIndex));

        if (!hasStagedChanges)
            throw new InvalidOperationException("Keine gestagten Änderungen vorhanden.");

        var fullMessage = string.IsNullOrWhiteSpace(description)
            ? message
            : $"{message}\n\n{description}";

        var config = repo.Config;
        var name = config.Get<string>("user.name")?.Value ?? "ghGPT User";
        var email = config.Get<string>("user.email")?.Value ?? "ghgpt@local";
        var author = new Signature(name, email, DateTimeOffset.Now);

        repo.Commit(fullMessage, author, author);
    }

    public Task FetchAsync(string id, IProgress<string>? progress = null) =>
        GitProcessHelper.RunGitOperationAsync(registry.GetById(id).LocalPath, "fetch --all --prune --progress", progress);

    public Task PullAsync(string id, IProgress<string>? progress = null) =>
        GitProcessHelper.RunGitOperationAsync(registry.GetById(id).LocalPath, "pull --progress", progress);

    public async Task PushAsync(string id, IProgress<string>? progress = null)
    {
        await GitProcessHelper.RunGitOperationAsync(registry.GetById(id).LocalPath, "push --progress", progress);
        UpdateRemoteTrackingRef(id);
    }

    public void Remove(string id) => registry.Remove(id);

    public void RefreshCurrentBranch(string id)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        info.CurrentBranch = repo.Head.FriendlyName;
    }

    private void UpdateRemoteTrackingRef(string id)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        var head = repo.Head;
        if (head.Tip is null || repo.Network.Remotes["origin"] is null) return;

        var trackingRefName = head.TrackedBranch?.CanonicalName
            ?? $"refs/remotes/origin/{head.FriendlyName}";

        var trackingRef = repo.Refs[trackingRefName];
        if (trackingRef is null)
            repo.Refs.Add(trackingRefName, head.Tip.Id);
        else
            repo.Refs.UpdateTarget(trackingRef, head.Tip.Id);
    }

    private static bool IsUntrackedFile(LibGit2Sharp.Repository repo, string filePath) =>
        repo.RetrieveStatus()
            .Any(entry => entry.FilePath == filePath && entry.State.HasFlag(FileStatus.NewInWorkdir));

    private static string BuildUntrackedFileDiff(string repoPath, string filePath)
    {
        var fullPath = Path.Combine(repoPath, filePath);
        if (!File.Exists(fullPath))
            return string.Empty;

        var content = File.ReadAllText(fullPath).Replace("\r\n", "\n");
        var lines = content.Split('\n');
        if (lines.Length > 0 && lines[^1] == string.Empty)
            lines = lines[..^1];

        var header = $"diff --git a/{filePath} b/{filePath}\nnew file mode 100644\n--- /dev/null\n+++ b/{filePath}\n";
        if (lines.Length == 0)
            return $"{header}@@ -0,0 +1,0 @@\n";

        var body = string.Join('\n', lines.Select(line => $"+{line}"));
        return $"{header}@@ -0,0 +1,{lines.Length} @@\n{body}\n";
    }

    private static CommitListItem MapCommitListItem(Commit commit) => new()
    {
        Sha = commit.Sha,
        ShortSha = commit.Sha[..7],
        Message = commit.MessageShort,
        AuthorName = commit.Author.Name,
        AuthorEmail = commit.Author.Email,
        AuthorDate = commit.Author.When
    };
}
