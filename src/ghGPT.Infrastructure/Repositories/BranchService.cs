using ghGPT.Core.Repositories;
using Git.Process.Abstractions;
using Git.Process.Branch.Models;

namespace ghGPT.Infrastructure.Repositories;

public class BranchService(RepositoryRegistry registry, IGitBranchClient git) : IBranchService
{
    public IReadOnlyList<BranchInfo> GetBranches(string id)
    {
        var info = registry.GetById(id);
        var branches = git.GetBranchesAsync(info.LocalPath).GetAwaiter().GetResult();
        return branches.Select(Map).ToList();
    }

    public void CheckoutBranch(string id, string branchName, CheckoutStrategy strategy = CheckoutStrategy.Normal, string? stashMessage = null)
    {
        var info = registry.GetById(id);

        var isDirty = git.HasUncommittedChangesAsync(info.LocalPath).GetAwaiter().GetResult();

        if (isDirty && strategy == CheckoutStrategy.Normal)
            throw new UncommittedChangesException();

        if (isDirty && strategy == CheckoutStrategy.Stash)
            git.StashAsync(info.LocalPath, stashMessage ?? "Auto-stash vor Branch-Wechsel").GetAwaiter().GetResult();

        if (isDirty && strategy == CheckoutStrategy.Discard)
        {
            git.ResetHardAsync(info.LocalPath).GetAwaiter().GetResult();
            git.CleanUntrackedAsync(info.LocalPath).GetAwaiter().GetResult();
        }

        var isLocal = git.BranchExistsAsync(info.LocalPath, branchName).GetAwaiter().GetResult();

        if (isLocal)
        {
            git.CheckoutAsync(info.LocalPath, branchName).GetAwaiter().GetResult();
            info.CurrentBranch = branchName;
        }
        else
        {
            var isRemote = git.IsRemoteBranchAsync(info.LocalPath, branchName).GetAwaiter().GetResult();
            if (!isRemote)
                throw new InvalidOperationException($"Branch '{branchName}' nicht gefunden.");

            var localName = branchName.Contains('/')
                ? branchName[(branchName.IndexOf('/') + 1)..]
                : branchName;

            if (git.BranchExistsAsync(info.LocalPath, localName).GetAwaiter().GetResult())
                throw new InvalidOperationException($"Lokaler Branch '{localName}' existiert bereits.");

            git.CheckoutNewTrackingBranchAsync(info.LocalPath, localName, branchName).GetAwaiter().GetResult();
            info.CurrentBranch = localName;
        }

        registry.Save();
    }

    public BranchInfo CreateBranch(string id, string name, string? startPoint = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Branch-Name darf nicht leer sein.");

        var info = registry.GetById(id);

        if (!string.IsNullOrWhiteSpace(startPoint))
        {
            var existsLocal = git.BranchExistsAsync(info.LocalPath, startPoint).GetAwaiter().GetResult();
            var existsRemote = !existsLocal && git.IsRemoteBranchAsync(info.LocalPath, startPoint).GetAwaiter().GetResult();
            if (!existsLocal && !existsRemote)
                throw new InvalidOperationException($"Start-Branch '{startPoint}' nicht gefunden.");
        }

        git.CreateBranchAsync(info.LocalPath, name, startPoint).GetAwaiter().GetResult();
        info.CurrentBranch = name;
        registry.Save();

        return new BranchInfo
        {
            Name = name,
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
        var current = await git.GetCurrentBranchAsync(info.LocalPath);
        if (current == branchName)
            throw new InvalidOperationException("Der aktive Branch kann nicht gelöscht werden.");

        var isRemote = await git.IsRemoteBranchAsync(info.LocalPath, branchName);

        if (!isRemote)
        {
            await git.DeleteLocalBranchAsync(info.LocalPath, branchName);
            return;
        }

        var slashIndex = branchName.IndexOf('/');
        if (slashIndex <= 0)
            throw new InvalidOperationException($"Remote-Branch '{branchName}' hat keinen Remote-Präfix.");

        var remoteName = branchName[..slashIndex];
        var branchOnRemote = branchName[(slashIndex + 1)..];

        await git.DeleteRemoteBranchAsync(info.LocalPath, remoteName, branchOnRemote, null);

        // Remove local tracking ref if present
        try { await git.DeleteLocalBranchAsync(info.LocalPath, branchName); }
        catch (InvalidOperationException) { /* ignore — remote ref may already be gone */ }
    }

    private static BranchInfo Map(GitBranchEntry entry) => new()
    {
        Name = entry.Name,
        IsRemote = entry.IsRemote,
        IsHead = entry.IsHead,
        AheadBy = entry.AheadBy,
        BehindBy = entry.BehindBy,
        TrackingBranch = entry.TrackingBranch
    };
}
