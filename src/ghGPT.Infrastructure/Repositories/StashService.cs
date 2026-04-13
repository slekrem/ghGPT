using ghGPT.Core.Repositories;
using LibGit2Sharp;
using System.Text.RegularExpressions;

namespace ghGPT.Infrastructure.Repositories;

public class StashService(RepositoryRegistry registry) : IStashService
{
    public IReadOnlyList<StashEntry> GetStashes(string id)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        return repo.Stashes
            .Select((stash, index) =>
            {
                var raw = stash.WorkTree?.MessageShort ?? stash.Message ?? string.Empty;
                ParseStashMessage(raw, out var branch, out var message);
                return new StashEntry
                {
                    Index = index,
                    Message = message,
                    Branch = branch,
                    CreatedAt = stash.Index?.Author.When ?? DateTimeOffset.MinValue
                };
            })
            .ToList();
    }

    public IReadOnlyList<CommitFileChange> GetStashDiff(string id, int index)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        if (index < 0 || index >= repo.Stashes.Count())
            throw new InvalidOperationException($"Stash[{index}] nicht gefunden.");

        var stash = repo.Stashes[index];
        var patch = repo.Diff.Compare<Patch>(stash.Base.Tree, stash.WorkTree.Tree);

        return patch.Select(entry => new CommitFileChange
        {
            Path = entry.Path,
            OldPath = entry.OldPath != entry.Path ? entry.OldPath : null,
            Status = entry.Status.ToString(),
            Additions = entry.LinesAdded,
            Deletions = entry.LinesDeleted,
            Patch = entry.Patch
        }).ToList();
    }

    public void PushStash(string id, string? message = null, string[]? paths = null)
    {
        var info = registry.GetById(id);
        var msgArg = message is not null ? $"-m \"{message}\" " : "";

        if (paths is { Length: > 0 })
        {
            var pathArgs = string.Join(" ", paths.Select(p => $"\"{p}\""));
            GitProcessHelper.RunGitSync(info.LocalPath, $"stash push {msgArg}-- {pathArgs}", "Stash fehlgeschlagen");
        }
        else
        {
            using var repo = new LibGit2Sharp.Repository(info.LocalPath);
            var sig = repo.Config.BuildSignature(DateTimeOffset.Now);
            var isDirty = repo.RetrieveStatus().IsDirty;
            if (!isDirty)
                throw new InvalidOperationException("Keine Änderungen zum Stashen vorhanden.");
            repo.Stashes.Add(sig, message ?? "Manueller Stash", StashModifiers.Default);
        }
    }

    public void PopStash(string id, int index = 0)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        if (index < 0 || index >= repo.Stashes.Count())
            throw new InvalidOperationException($"Stash[{index}] nicht gefunden.");

        var result = repo.Stashes.Pop(index, new StashApplyOptions());
        if (result == StashApplyStatus.Conflicts)
            throw new InvalidOperationException("Stash konnte nicht angewendet werden: Konflikte im Working Directory.");
        if (result != StashApplyStatus.Applied)
            throw new InvalidOperationException($"Stash konnte nicht angewendet werden: {result}.");
    }

    public void DropStash(string id, int index)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        if (index < 0 || index >= repo.Stashes.Count())
            throw new InvalidOperationException($"Stash[{index}] nicht gefunden.");

        repo.Stashes.Remove(index);
    }

    // Git stash messages are formatted as:
    //   "On <branch>: <user message>"       (when -m is provided)
    //   "WIP on <branch>: <sha> <commit>"   (auto-generated)
    private static void ParseStashMessage(string raw, out string branch, out string message)
    {
        var onMatch = Regex.Match(raw, @"^On (.+?): (.+)$");
        if (onMatch.Success)
        {
            branch = onMatch.Groups[1].Value;
            message = onMatch.Groups[2].Value;
            return;
        }
        var wipMatch = Regex.Match(raw, @"^WIP on (.+?): \S+ (.+)$");
        if (wipMatch.Success)
        {
            branch = wipMatch.Groups[1].Value;
            message = wipMatch.Groups[2].Value;
            return;
        }
        branch = string.Empty;
        message = raw;
    }
}
