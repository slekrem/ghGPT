using ghGPT.Ai.Abstractions;
using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging;
using System.Text;

namespace ghGPT.Ai;

internal sealed class ChatContextBuilder(
    IRepositoryService repositoryService,
    IBranchService branchService,
    IPullRequestService pullRequestService,
    IChatHistoryService historyService,
    IDiffService diffService,
    ILogger<ChatContextBuilder> logger) : IChatContextBuilder
{
    public async Task<IEnumerable<ChatMessage>> BuildAsync(ChatRequest request)
    {
        var result = new List<ChatMessage>
        {
            new() { Role = "system", Content = SystemPrompt.Build(request.RepoId, request.Branch) }
        };

        var repoContext = BuildRepositoryContext(request.RepoId);
        if (repoContext is not null)
            result.Add(new ChatMessage { Role = "system", Content = repoContext });

        var viewContext = await BuildViewContextAsync(request);
        if (viewContext is not null)
            result.Add(new ChatMessage { Role = "system", Content = viewContext });

        if (!string.IsNullOrEmpty(request.RepoId))
        {
            var history = historyService.Load(request.RepoId);
            foreach (var entry in history)
                result.Add(new ChatMessage { Role = entry.Role, Content = entry.Content });
        }

        result.Add(new ChatMessage { Role = "user", Content = request.Message });
        return result;
    }

    private string? BuildRepositoryContext(string? repoId)
    {
        if (string.IsNullOrEmpty(repoId)) return null;

        try
        {
            var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
            if (repo is null) return null;

            var sb = new StringBuilder();
            sb.AppendLine("## Repository-Kontext");
            sb.AppendLine($"- Name: {repo.Name}");
            sb.AppendLine($"- Pfad: {repo.LocalPath}");

            if (!string.IsNullOrEmpty(repo.RemoteUrl))
                sb.AppendLine($"- Remote: {repo.RemoteUrl}");

            var branches = branchService.GetBranches(repoId);
            var head = branches.FirstOrDefault(b => b.IsHead && !b.IsRemote);
            if (head is not null)
            {
                sb.Append($"- Aktueller Branch: {head.Name}");
                if (head.TrackingBranch is not null)
                {
                    if (head.AheadBy > 0 || head.BehindBy > 0)
                        sb.Append($" (↑{head.AheadBy} voraus, ↓{head.BehindBy} zurück)");
                    else
                        sb.Append(" (aktuell)");
                }
                sb.AppendLine();
            }

            var commits = repositoryService.GetHistory(repoId, limit: 5);
            if (commits.Count > 0)
            {
                sb.AppendLine("- Letzte Commits:");
                foreach (var c in commits)
                    sb.AppendLine($"  - {c.ShortSha} {c.Message} ({c.AuthorName})");
            }

            var status = repositoryService.GetStatus(repoId);
            if (status.Staged.Count > 0 || status.Unstaged.Count > 0)
                sb.AppendLine($"- Änderungen: {status.Staged.Count} staged, {status.Unstaged.Count} unstaged");

            return sb.ToString().TrimEnd();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Repository-Kontext konnte nicht erstellt werden für Repo {RepoId}.", repoId);
            return null;
        }
    }

    private async Task<string?> BuildViewContextAsync(ChatRequest request)
    {
        if (string.IsNullOrEmpty(request.RepoId) || string.IsNullOrEmpty(request.ActiveView))
            return null;

        try
        {
            return request.ActiveView switch
            {
                ChatViews.Changes => BuildChangesContext(request.RepoId),
                ChatViews.History => BuildHistoryContext(request.RepoId),
                ChatViews.Branches => BuildBranchesContext(request.RepoId),
                ChatViews.PullRequests => await BuildPullRequestsContextAsync(request.RepoId),
                _ => null
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "View-Kontext '{ActiveView}' konnte nicht erstellt werden für Repo {RepoId}.", request.ActiveView, request.RepoId);
            return null;
        }
    }

    private string? BuildChangesContext(string repoId)
    {
        var status = repositoryService.GetStatus(repoId);
        var fileCount = status.Staged.Concat(status.Unstaged)
            .Select(f => f.FilePath)
            .Distinct()
            .Count();

        if (fileCount == 0) return null;

        var diff = diffService.BuildCombinedDiff(repoId);
        if (string.IsNullOrEmpty(diff)) return null;

        var sb = new StringBuilder();
        sb.AppendLine("## Ansicht: Änderungen");
        sb.AppendLine($"Geänderte Dateien: {fileCount}");
        sb.AppendLine();
        sb.AppendLine("```diff");
        sb.AppendLine(diff);
        sb.AppendLine("```");

        return sb.ToString().TrimEnd();
    }

    private string BuildHistoryContext(string repoId)
    {
        var commits = repositoryService.GetHistory(repoId, limit: 10);
        if (commits.Count == 0) return "## Ansicht: History\nKeine Commits vorhanden.";

        var sb = new StringBuilder();
        sb.AppendLine("## Ansicht: History (letzte 10 Commits)");
        foreach (var c in commits)
            sb.AppendLine($"- {c.ShortSha} {c.AuthorDate:yyyy-MM-dd} **{c.AuthorName}**: {c.Message}");

        return sb.ToString().TrimEnd();
    }

    private string BuildBranchesContext(string repoId)
    {
        var branches = branchService.GetBranches(repoId);
        var sb = new StringBuilder();
        sb.AppendLine("## Ansicht: Branches");

        var local = branches.Where(b => !b.IsRemote).ToList();
        var remote = branches.Where(b => b.IsRemote).ToList();

        if (local.Count > 0)
        {
            sb.AppendLine("### Lokale Branches");
            foreach (var b in local)
            {
                var marker = b.IsHead ? " ← aktiv" : "";
                var tracking = b.TrackingBranch is not null
                    ? $" (↑{b.AheadBy} ↓{b.BehindBy})"
                    : " (kein Tracking)";
                sb.AppendLine($"- {b.Name}{tracking}{marker}");
            }
        }

        if (remote.Count > 0)
        {
            sb.AppendLine("### Remote Branches");
            foreach (var b in remote)
                sb.AppendLine($"- {b.Name}");
        }

        return sb.ToString().TrimEnd();
    }

    private async Task<string?> BuildPullRequestsContextAsync(string repoId)
    {
        var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
        if (repo?.RemoteUrl is null) return null;

        var (owner, repoName) = RemoteUrlParser.Parse(repo.RemoteUrl);
        var prs = await pullRequestService.GetPullRequestsAsync(owner, repoName);
        if (prs.Count == 0) return "## Ansicht: Pull Requests\nKeine offenen Pull Requests.";

        var sb = new StringBuilder();
        sb.AppendLine($"## Ansicht: Pull Requests ({prs.Count} offen)");
        foreach (var pr in prs.Take(10))
        {
            var labels = pr.Labels.Count > 0 ? $" [{string.Join(", ", pr.Labels)}]" : "";
            var draft = pr.IsDraft ? " [Draft]" : "";
            sb.AppendLine($"- #{pr.Number} **{pr.Title}**{draft}{labels} ({pr.AuthorLogin}, {pr.HeadBranch} → {pr.BaseBranch})");
        }

        return sb.ToString().TrimEnd();
    }
}
