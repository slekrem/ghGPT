using ghGPT.Core.Repositories;
using Git.Process.Abstractions;
using Git.Process.Repository.Models;
using Git.Process.Stash.Models;

namespace ghGPT.Infrastructure.Repositories;

public class StashService(RepositoryRegistry registry, IGitStashClient git) : IStashService
{
    public IReadOnlyList<StashEntry> GetStashes(string id)
    {
        var info = registry.GetById(id);
        var entries = git.GetStashesAsync(info.LocalPath).GetAwaiter().GetResult();
        return entries.Select(Map).ToList();
    }

    public IReadOnlyList<CommitFileChange> GetStashDiff(string id, int index)
    {
        var info = registry.GetById(id);
        var changes = git.GetStashDiffAsync(info.LocalPath, index).GetAwaiter().GetResult();
        return changes.Select(MapFileChange).ToList();
    }

    public void PushStash(string id, string? message = null, string[]? paths = null)
    {
        var info = registry.GetById(id);
        git.PushStashAsync(info.LocalPath, message ?? "Manueller Stash", paths).GetAwaiter().GetResult();
    }

    public void PopStash(string id, int index = 0)
    {
        var info = registry.GetById(id);
        git.PopStashAsync(info.LocalPath, index).GetAwaiter().GetResult();
    }

    public void DropStash(string id, int index)
    {
        var info = registry.GetById(id);
        git.DropStashAsync(info.LocalPath, index).GetAwaiter().GetResult();
    }

    private static StashEntry Map(GitStashEntry entry) => new()
    {
        Index = entry.Index,
        Message = entry.Message,
        Branch = entry.Branch,
        CreatedAt = entry.CreatedAt
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
