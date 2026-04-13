using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging;
using System.Text;

namespace ghGPT.Ai;

internal sealed class DiffService(IRepositoryService repositoryService, ILogger<DiffService> logger) : IDiffService
{
    public string BuildStagedDiff(string repoId)
    {
        try
        {
            var status = repositoryService.GetStatus(repoId);
            if (status.Staged.Count == 0) return string.Empty;

            var sb = new StringBuilder();
            foreach (var file in status.Staged)
            {
                try
                {
                    var diff = repositoryService.GetDiff(repoId, file.FilePath, staged: true);
                    if (!string.IsNullOrEmpty(diff))
                    {
                        sb.AppendLine($"### {file.FilePath}");
                        sb.AppendLine(diff);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Staged-Diff für {FilePath} übersprungen.", file.FilePath);
                }
            }
            return sb.ToString().TrimEnd();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Staged-Diff konnte nicht erstellt werden für Repo {RepoId}.", repoId);
            return string.Empty;
        }
    }

    public string BuildCombinedDiff(string repoId)
    {
        try
        {
            var status = repositoryService.GetStatus(repoId);
            var allFiles = status.Staged
                .Select(f => f.FilePath)
                .Concat(status.Unstaged.Select(f => f.FilePath))
                .Distinct()
                .ToList();

            if (allFiles.Count == 0) return string.Empty;

            var sb = new StringBuilder();
            foreach (var file in allFiles)
            {
                try
                {
                    var diff = repositoryService.GetCombinedDiff(repoId, file);
                    if (!string.IsNullOrEmpty(diff))
                    {
                        sb.AppendLine($"### {file}");
                        sb.AppendLine(diff);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Combined-Diff für {FilePath} übersprungen.", file);
                }
            }
            return sb.ToString().TrimEnd();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Combined-Diff konnte nicht erstellt werden für Repo {RepoId}.", repoId);
            return string.Empty;
        }
    }
}
