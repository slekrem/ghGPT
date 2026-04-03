using ghGPT.Core.Ai;
using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.PullRequests;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Infrastructure.Ai;

internal sealed class ChatService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService,
    IPullRequestService pullRequestService,
    IChatHistoryService historyService) : IChatService
{
    private const int MaxToolRounds = 5;

    public async IAsyncEnumerable<ChatEvent> StreamAsync(
        ChatRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messages = await BuildMessagesAsync(request);

        if (!string.IsNullOrEmpty(request.RepoId))
            historyService.Append(request.RepoId, "user", request.Message);

        // Tool-Loop: nur wenn ein Repo aktiv ist
        if (!string.IsNullOrEmpty(request.RepoId))
        {
            var dispatcher = new ToolDispatcher(repositoryService);
            var messageList = messages.ToList();
            var tools = ToolDefinitions.All;
            string? toolLoopAnswer = null;

            for (var round = 0; round < MaxToolRounds; round++)
            {
                var toolResponse = await ollamaClient.CompleteWithToolsAsync(messageList, tools, cancellationToken);

                if (!toolResponse.HasToolCalls)
                {
                    // LLM hat direkt geantwortet, kein weiterer Request nötig
                    toolLoopAnswer = toolResponse.Content ?? string.Empty;
                    break;
                }

                // Assistent-Message mit tool_calls hinzufügen
                messageList.Add(new ChatMessage
                {
                    Role = "assistant",
                    ToolCalls = toolResponse.ToolCalls.ToList()
                });

                // Jedes Tool ausführen und Ergebnis als Event liefern
                foreach (var toolCall in toolResponse.ToolCalls)
                {
                    var (result, displayArgs, success) = await dispatcher.DispatchAsync(toolCall, request.RepoId, cancellationToken);

                    yield return new ToolExecutedEvent(
                        ToolName: toolCall.Name,
                        DisplayArgs: displayArgs,
                        Success: success,
                        Message: success ? GetSuccessMessage(toolCall.Name, displayArgs) : result);

                    // Tool-Ergebnis-Message hinzufügen
                    messageList.Add(new ChatMessage
                    {
                        Role = "tool",
                        ToolCallId = toolCall.Id,
                        Content = result
                    });
                }
            }

            if (toolLoopAnswer is not null)
            {
                // Antwort direkt aus Tool-Loop verwenden — kein zweiter Request
                if (toolLoopAnswer.Length > 0)
                {
                    yield return new TokenEvent(toolLoopAnswer);
                    historyService.Append(request.RepoId, "assistant", toolLoopAnswer);
                }
                yield break;
            }

            // Nach Tool-Ausführungen: finale Antwort mit erweitertem Kontext streamen
            messages = messageList;
        }

        // Finale Antwort streamen (kein Repo aktiv, oder nach Tool-Runden ohne direkte Antwort)
        var assistantResponse = new StringBuilder();
        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
        {
            assistantResponse.Append(token);
            yield return new TokenEvent(token);
        }

        if (!string.IsNullOrEmpty(request.RepoId) && assistantResponse.Length > 0)
            historyService.Append(request.RepoId, "assistant", assistantResponse.ToString());
    }

    private static string GetSuccessMessage(string toolName, string displayArgs) => toolName switch
    {
        "get_status" => "Repository-Status abgerufen",
        "get_branches" => "Branches abgerufen",
        "checkout_branch" => $"Branch gewechselt: {displayArgs.Replace("checkout_branch(", "").TrimEnd(')')}",
        "create_branch" => $"Branch erstellt: {displayArgs.Replace("create_branch(", "").TrimEnd(')')}",
        "get_history" => "Commit-History abgerufen",
        "fetch" => "Remote-Stand aktualisiert (fetch)",
        _ => displayArgs
    };

    private async Task<IEnumerable<ChatMessage>> BuildMessagesAsync(ChatRequest request)
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

        // Gesprächshistorie nach den System-Messages einfügen
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

            var branches = repositoryService.GetBranches(repoId);
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
            var stagedCount = status.Staged.Count;
            var unstagedCount = status.Unstaged.Count;
            if (stagedCount > 0 || unstagedCount > 0)
                sb.AppendLine($"- Änderungen: {stagedCount} staged, {unstagedCount} unstaged");

            return sb.ToString().TrimEnd();
        }
        catch
        {
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
        catch
        {
            return null;
        }
    }

    private string? BuildChangesContext(string repoId)
    {
        var status = repositoryService.GetStatus(repoId);
        var allFiles = status.Staged.Concat(status.Unstaged)
            .Select(f => f.FilePath)
            .Distinct()
            .ToList();

        if (allFiles.Count == 0) return null;

        var sb = new StringBuilder();
        sb.AppendLine("## Ansicht: Änderungen");
        sb.AppendLine($"Geänderte Dateien: {allFiles.Count}");
        sb.AppendLine();

        foreach (var file in allFiles)
        {
            try
            {
                var diff = repositoryService.GetCombinedDiff(repoId, file);
                if (string.IsNullOrEmpty(diff)) continue;

                sb.AppendLine($"### {file}");
                sb.AppendLine("```diff");
                sb.AppendLine(diff);
                sb.AppendLine("```");
            }
            catch { /* Datei überspringen */ }
        }

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
        var branches = repositoryService.GetBranches(repoId);
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

        var (owner, repoName) = PullRequestService.ParseRemoteUrl(repo.RemoteUrl);
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
