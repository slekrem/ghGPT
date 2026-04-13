using ghGPT.Core.Repositories;
using LibGit2Sharp;
using System.Text;

namespace ghGPT.Infrastructure.Repositories;

public class StagingService(RepositoryRegistry registry) : IStagingService
{
    public void StageFile(string id, string filePath)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Stage(repo, filePath);
    }

    public void UnstageFile(string id, string filePath)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Unstage(repo, filePath);
    }

    public void StageAll(string id)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Stage(repo, "*");
    }

    public void UnstageAll(string id)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);
        Commands.Unstage(repo, "*");
    }

    public void StageLines(string id, string filePath, string patch)
    {
        ValidatePatch(patch);
        var info = registry.GetById(id);
        ApplyPatch(info.LocalPath, patch, "--cached");
    }

    public void UnstageLines(string id, string filePath, string patch)
    {
        ValidatePatch(patch);
        var info = registry.GetById(id);
        ApplyPatch(info.LocalPath, patch, "--cached --reverse");
    }

    public void DiscardFile(string id, string filePath)
    {
        var info = registry.GetById(id);
        using var repo = new LibGit2Sharp.Repository(info.LocalPath);

        var existsInHead = repo.Head.Tip?.Tree?[filePath] is not null;

        if (!existsInHead)
        {
            try { Commands.Unstage(repo, filePath); } catch { /* ignore if not staged */ }
            var fullPath = Path.Combine(info.LocalPath, filePath);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        else
        {
            GitProcessHelper.RunGitSync(info.LocalPath,
                $"restore --source=HEAD --staged --worktree -- \"{filePath}\"",
                "Änderungen konnten nicht verworfen werden");
        }
    }

    public void DiscardLines(string id, string filePath, string patch)
    {
        ValidatePatch(patch);
        var info = registry.GetById(id);
        ApplyPatch(info.LocalPath, patch, "--reverse");
    }

    private static void ApplyPatch(string workingDirectory, string patch, string flags)
    {
        var tempFile = Path.GetTempFileName();
        try
        {
            File.WriteAllText(tempFile, patch, Encoding.UTF8);
            GitProcessHelper.RunGitSync(workingDirectory,
                $"apply {flags} \"{tempFile}\"",
                "Patch konnte nicht angewendet werden");
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    private static void ValidatePatch(string patch)
    {
        if (!patch.Contains("@@"))
            throw new InvalidOperationException("Ungültiges Patch-Format: kein Hunk-Header (@@) gefunden.");
        if (!patch.Contains("---") || !patch.Contains("+++"))
            throw new InvalidOperationException("Ungültiges Patch-Format: fehlende Datei-Header (--- / +++).");
        var lines = patch.Split('\n');
        var hasChange = lines.Any(l => l.StartsWith('+') && !l.StartsWith("+++"))
                     || lines.Any(l => l.StartsWith('-') && !l.StartsWith("---"));
        if (!hasChange)
            throw new InvalidOperationException("Patch enthält keine Änderungen.");
    }
}
