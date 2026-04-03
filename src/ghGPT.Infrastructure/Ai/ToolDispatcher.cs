using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using System.Text;
using System.Text.Json;

namespace ghGPT.Infrastructure.Ai;

internal sealed class ToolDispatcher(IRepositoryService repositoryService)
{
    public async Task<(string Result, string DisplayArgs, bool Success)> DispatchAsync(
        ToolCall toolCall,
        string repoId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var args = string.IsNullOrWhiteSpace(toolCall.ArgumentsJson)
                ? JsonDocument.Parse("{}")
                : JsonDocument.Parse(toolCall.ArgumentsJson);

            return toolCall.Name switch
            {
                "get_status" => ExecuteGetStatus(repoId),
                "get_branches" => ExecuteGetBranches(repoId),
                "checkout_branch" => ExecuteCheckoutBranch(repoId, args),
                "create_branch" => ExecuteCreateBranch(repoId, args),
                "get_history" => ExecuteGetHistory(repoId, args),
                "fetch" => await ExecuteFetchAsync(repoId, cancellationToken),
                _ => ($"Unbekanntes Tool: {toolCall.Name}", toolCall.Name, false)
            };
        }
        catch (Exception ex)
        {
            return ($"Fehler: {ex.Message}", toolCall.Name, false);
        }
    }

    private (string, string, bool) ExecuteGetStatus(string repoId)
    {
        var status = repositoryService.GetStatus(repoId);
        var sb = new StringBuilder();

        if (status.Staged.Count > 0)
        {
            sb.AppendLine($"Staged ({status.Staged.Count}):");
            foreach (var f in status.Staged)
                sb.AppendLine($"  + {f.FilePath} [{f.Status}]");
        }

        if (status.Unstaged.Count > 0)
        {
            sb.AppendLine($"Unstaged ({status.Unstaged.Count}):");
            foreach (var f in status.Unstaged)
                sb.AppendLine($"  ~ {f.FilePath} [{f.Status}]");
        }

        if (status.Staged.Count == 0 && status.Unstaged.Count == 0)
            sb.AppendLine("Keine Änderungen vorhanden. Working tree ist sauber.");

        return (sb.ToString().TrimEnd(), "get_status", true);
    }

    private (string, string, bool) ExecuteGetBranches(string repoId)
    {
        var branches = repositoryService.GetBranches(repoId);
        var sb = new StringBuilder();

        var local = branches.Where(b => !b.IsRemote).ToList();
        var remote = branches.Where(b => b.IsRemote).ToList();

        sb.AppendLine($"Lokale Branches ({local.Count}):");
        foreach (var b in local)
        {
            var marker = b.IsHead ? " ← aktiv" : "";
            var tracking = b.TrackingBranch is not null ? $" (↑{b.AheadBy} ↓{b.BehindBy})" : "";
            sb.AppendLine($"  {b.Name}{tracking}{marker}");
        }

        if (remote.Count > 0)
        {
            sb.AppendLine($"Remote Branches ({remote.Count}):");
            foreach (var b in remote)
                sb.AppendLine($"  {b.Name}");
        }

        return (sb.ToString().TrimEnd(), "get_branches", true);
    }

    private (string, string, bool) ExecuteCheckoutBranch(string repoId, JsonDocument args)
    {
        var name = args.RootElement.TryGetProperty("name", out var n) ? n.GetString() : null;
        if (string.IsNullOrWhiteSpace(name))
            return ("Fehler: Branch-Name fehlt.", "checkout_branch", false);

        repositoryService.CheckoutBranch(repoId, name);
        return ($"Branch '{name}' wurde erfolgreich ausgecheckt.", $"checkout_branch({name})", true);
    }

    private (string, string, bool) ExecuteCreateBranch(string repoId, JsonDocument args)
    {
        var name = args.RootElement.TryGetProperty("name", out var n) ? n.GetString() : null;
        if (string.IsNullOrWhiteSpace(name))
            return ("Fehler: Branch-Name fehlt.", "create_branch", false);

        var startPoint = args.RootElement.TryGetProperty("start_point", out var sp) ? sp.GetString() : null;
        var branch = repositoryService.CreateBranch(repoId, name, startPoint);

        var displayArgs = startPoint is not null ? $"create_branch({name}, von {startPoint})" : $"create_branch({name})";
        return ($"Branch '{branch.Name}' wurde erfolgreich erstellt.", displayArgs, true);
    }

    private (string, string, bool) ExecuteGetHistory(string repoId, JsonDocument args)
    {
        var count = args.RootElement.TryGetProperty("count", out var countProp) && countProp.TryGetInt32(out var v)
            ? Math.Clamp(v, 1, 50)
            : 10;

        var commits = repositoryService.GetHistory(repoId, count);
        var sb = new StringBuilder();
        sb.AppendLine($"Letzte {commits.Count} Commits:");
        foreach (var commit in commits)
            sb.AppendLine($"  {commit.ShortSha} {commit.AuthorDate:yyyy-MM-dd} {commit.AuthorName}: {commit.Message}");

        return (sb.ToString().TrimEnd(), $"get_history({count})", true);
    }

    private async Task<(string, string, bool)> ExecuteFetchAsync(string repoId, CancellationToken cancellationToken)
    {
        var progress = new List<string>();
        await repositoryService.FetchAsync(repoId, new Progress<string>(msg => progress.Add(msg)));

        var result = progress.Count > 0
            ? string.Join("\n", progress)
            : "Fetch erfolgreich abgeschlossen. Remote-Stand ist aktuell.";

        return (result, "fetch", true);
    }
}
