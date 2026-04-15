using ghGPT.Core.Repositories;
using Git.Process.Abstractions;

namespace ghGPT.Infrastructure.Repositories;

public class StagingService(RepositoryRegistry registry, IGitStagingClient git) : IStagingService
{
    public void StageFile(string id, string filePath)
    {
        var info = registry.GetById(id);
        git.StageFileAsync(info.LocalPath, filePath).GetAwaiter().GetResult();
    }

    public void UnstageFile(string id, string filePath)
    {
        var info = registry.GetById(id);
        git.UnstageFileAsync(info.LocalPath, filePath).GetAwaiter().GetResult();
    }

    public void StageAll(string id)
    {
        var info = registry.GetById(id);
        git.StageAllAsync(info.LocalPath).GetAwaiter().GetResult();
    }

    public void UnstageAll(string id)
    {
        var info = registry.GetById(id);
        git.UnstageAllAsync(info.LocalPath).GetAwaiter().GetResult();
    }

    public void StageLines(string id, string filePath, string patch)
    {
        ValidatePatch(patch);
        var info = registry.GetById(id);
        git.ApplyPatchAsync(info.LocalPath, patch, cached: true, reverse: false).GetAwaiter().GetResult();
    }

    public void UnstageLines(string id, string filePath, string patch)
    {
        ValidatePatch(patch);
        var info = registry.GetById(id);
        git.ApplyPatchAsync(info.LocalPath, patch, cached: true, reverse: true).GetAwaiter().GetResult();
    }

    public void DiscardFile(string id, string filePath)
    {
        var info = registry.GetById(id);
        var existsInHead = git.ExistsInHeadAsync(info.LocalPath, filePath).GetAwaiter().GetResult();

        if (!existsInHead)
        {
            try { git.UnstageFileAsync(info.LocalPath, filePath).GetAwaiter().GetResult(); }
            catch { /* ignore if not staged */ }

            var fullPath = Path.Combine(info.LocalPath, filePath);
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }
        else
        {
            git.RestoreFromHeadAsync(info.LocalPath, filePath).GetAwaiter().GetResult();
        }
    }

    public void DiscardLines(string id, string filePath, string patch)
    {
        ValidatePatch(patch);
        var info = registry.GetById(id);
        git.ApplyPatchAsync(info.LocalPath, patch, cached: false, reverse: true).GetAwaiter().GetResult();
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
