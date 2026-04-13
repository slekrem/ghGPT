using ghGPT.Core.Repositories;
using LibGit2Sharp;

namespace ghGPT.Infrastructure.Repositories;

public class BranchService(RepositoryRegistry registry) : IBranchService
{
    public IReadOnlyList<BranchInfo> GetBranches(string id)
    {
        var info = registry.GetById(id);
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

    public void CheckoutBranch(string id, string branchName, CheckoutStrategy strategy = CheckoutStrategy.Normal, string? stashMessage = null)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var status = repo.RetrieveStatus();
        var isDirty = status.Any(e =>
            e.State != FileStatus.Ignored &&
            e.State != FileStatus.Unaltered);

        if (isDirty && strategy == CheckoutStrategy.Normal)
            throw new UncommittedChangesException();

        if (isDirty && strategy == CheckoutStrategy.Stash)
        {
            var sig = repo.Config.BuildSignature(DateTimeOffset.Now);
            repo.Stashes.Add(sig, stashMessage ?? "Auto-stash vor Branch-Wechsel", StashModifiers.Default);
        }

        if (isDirty && strategy == CheckoutStrategy.Discard)
        {
            repo.Reset(ResetMode.Hard);
            foreach (var entry in status.Where(e => e.State == FileStatus.NewInWorkdir))
                File.Delete(Path.Combine(info.LocalPath, entry.FilePath));
        }

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

        registry.Save();
    }

    public BranchInfo CreateBranch(string id, string name, string? startPoint = null)
    {
        var info = registry.GetById(id);
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
        registry.Save();

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

    public async Task DeleteBranch(string id, string branchName)
    {
        var info = registry.GetById(id);

        bool isRemote;
        string remoteName;
        string branchOnRemote;

        using (var repo = new LibGit2Sharp.Repository(info.LocalPath))
        {
            var branch = repo.Branches[branchName]
                ?? throw new InvalidOperationException($"Branch '{branchName}' nicht gefunden.");

            if (branch.IsCurrentRepositoryHead)
                throw new InvalidOperationException("Der aktive Branch kann nicht gelöscht werden.");

            isRemote = branch.IsRemote;
            if (!isRemote)
            {
                repo.Branches.Remove(branch);
                return;
            }

            remoteName = branch.RemoteName;
            branchOnRemote = branch.FriendlyName[(remoteName.Length + 1)..];
        }

        await GitProcessHelper.RunGitOperationAsync(info.LocalPath, $"push {remoteName} --delete {branchOnRemote}", null);

        using var repoAfter = new LibGit2Sharp.Repository(info.LocalPath);
        var trackingBranch = repoAfter.Branches[branchName];
        if (trackingBranch is not null)
            repoAfter.Branches.Remove(trackingBranch);
    }
}
