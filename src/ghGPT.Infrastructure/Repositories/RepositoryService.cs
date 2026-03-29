using ghGPT.Core.Repositories;
using LibGit2Sharp;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryService(IRepositoryStore store) : IRepositoryService
{
    private readonly List<RepositoryInfo> _repos = [.. store.Load()];
    private string? _activeRepoId;

    public IReadOnlyList<RepositoryInfo> GetAll() => _repos.AsReadOnly();

    public RepositoryInfo? GetActive() =>
        _activeRepoId is not null ? _repos.FirstOrDefault(r => r.Id == _activeRepoId) : null;

    public void SetActive(string id)
    {
        if (_repos.All(r => r.Id != id))
            throw new InvalidOperationException($"Repository '{id}' nicht gefunden.");
        _activeRepoId = id;
    }

    public Task<RepositoryInfo> CreateAsync(string localPath, string name)
    {
        Directory.CreateDirectory(localPath);
        LibGit2Sharp.Repository.Init(localPath);

        var info = BuildInfo(localPath);
        _repos.Add(info);
        store.Save(_repos);
        return Task.FromResult(info);
    }

    public Task<RepositoryInfo> ImportAsync(string localPath)
    {
        if (!LibGit2Sharp.Repository.IsValid(localPath))
            throw new InvalidOperationException($"'{localPath}' ist kein gültiges Git-Repository.");

        if (_repos.Any(r => r.LocalPath == localPath))
            throw new InvalidOperationException($"Repository '{localPath}' ist bereits importiert.");

        var info = BuildInfo(localPath);
        _repos.Add(info);
        store.Save(_repos);
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

        var info = BuildInfo(localPath);
        _repos.Add(info);
        store.Save(_repos);
        return Task.FromResult(info);
    }

    public RepositoryStatusResult GetStatus(string id)
    {
        var info = GetRepoById(id);
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
        var info = GetRepoById(id);
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
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var branchName = string.IsNullOrWhiteSpace(branch) ? repo.Head.FriendlyName : branch;
        var selectedBranch = repo.Branches[branchName]
            ?? throw new InvalidOperationException($"Branch '{branchName}' nicht gefunden.");

        var commits = selectedBranch.Commits
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
        var info = GetRepoById(id);
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
        var info = GetRepoById(id);
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

    public void StageFile(string id, string filePath)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Stage(repo, filePath);
    }

    public void UnstageFile(string id, string filePath)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Unstage(repo, filePath);
    }

    public void StageAll(string id)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Stage(repo, "*");
    }

    public void UnstageAll(string id)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Unstage(repo, "*");
    }

    public void Commit(string id, string message, string? description = null)
    {
        var info = GetRepoById(id);
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

    public void Remove(string id)
    {
        var repo = GetRepoById(id);
        _repos.Remove(repo);
        if (_activeRepoId == id) _activeRepoId = null;
        store.Save(_repos);
    }

    public IReadOnlyList<BranchInfo> GetBranches(string id)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        return repo.Branches
            .Select(branch => new BranchInfo
            {
                Name = branch.FriendlyName,
                IsRemote = branch.IsRemote,
                IsHead = branch.IsCurrentRepositoryHead,
                AheadBy = branch.TrackingDetails?.AheadBy ?? 0,
                BehindBy = branch.TrackingDetails?.BehindBy ?? 0,
                TrackingBranch = branch.TrackedBranch?.FriendlyName
            })
            .OrderBy(b => b.IsRemote)
            .ThenBy(b => b.Name)
            .ToList();
    }

    public void CheckoutBranch(string id, string branchName)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var status = repo.RetrieveStatus();
        var isDirty = status.Any(e =>
            e.State != FileStatus.Ignored &&
            e.State != FileStatus.Unaltered);

        if (isDirty)
            throw new InvalidOperationException("Uncommitted changes vorhanden. Bitte zuerst committen oder stashen.");

        var branch = repo.Branches[branchName]
            ?? throw new InvalidOperationException($"Branch '{branchName}' nicht gefunden.");

        if (branch.IsRemote)
        {
            var localName = branch.FriendlyName.Contains('/')
                ? branch.FriendlyName[(branch.FriendlyName.IndexOf('/') + 1)..]
                : branch.FriendlyName;

            if (repo.Branches[localName] is not null)
                throw new InvalidOperationException($"Lokaler Branch '{localName}' existiert bereits.");

            var localBranch = repo.CreateBranch(localName, branch.Tip);
            repo.Branches.Update(localBranch, b => b.TrackedBranch = branch.CanonicalName);
            Commands.Checkout(repo, localBranch);
            info.CurrentBranch = localBranch.FriendlyName;
        }
        else
        {
            Commands.Checkout(repo, branch);
            info.CurrentBranch = branch.FriendlyName;
        }
    }

    public BranchInfo CreateBranch(string id, string name, string? startPoint = null)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Branch-Name darf nicht leer sein.");

        Commit? startCommit = null;
        if (!string.IsNullOrWhiteSpace(startPoint))
        {
            var startBranch = repo.Branches[startPoint]
                ?? throw new InvalidOperationException($"Start-Branch '{startPoint}' nicht gefunden.");
            startCommit = startBranch.Tip;
        }

        var newBranch = startCommit is not null
            ? repo.CreateBranch(name, startCommit)
            : repo.CreateBranch(name);

        Commands.Checkout(repo, newBranch);
        info.CurrentBranch = newBranch.FriendlyName;

        return new BranchInfo
        {
            Name = newBranch.FriendlyName,
            IsRemote = false,
            IsHead = true,
            AheadBy = 0,
            BehindBy = 0,
            TrackingBranch = null
        };
    }

    public void DeleteBranch(string id, string branchName)
    {
        var info = GetRepoById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var branch = repo.Branches[branchName]
            ?? throw new InvalidOperationException($"Branch '{branchName}' nicht gefunden.");

        if (branch.IsCurrentRepositoryHead)
            throw new InvalidOperationException("Der aktive Branch kann nicht gelöscht werden.");

        repo.Branches.Remove(branch);
    }

    private RepositoryInfo GetRepoById(string id) =>
        _repos.FirstOrDefault(r => r.Id == id)
        ?? throw new InvalidOperationException($"Repository '{id}' nicht gefunden.");

    private static RepositoryInfo BuildInfo(string localPath)
    {
        using var repo = new LibGit2Sharp.Repository(localPath);
        var name = Path.GetFileName(localPath.TrimEnd(Path.DirectorySeparatorChar));
        var remoteUrl = repo.Network.Remotes["origin"]?.Url;
        var branch = repo.Head.FriendlyName;
        var id = Guid.NewGuid().ToString();
        return new RepositoryInfo
        {
            Id = id,
            Name = name,
            LocalPath = localPath,
            RemoteUrl = remoteUrl,
            CurrentBranch = branch
        };
    }
}
