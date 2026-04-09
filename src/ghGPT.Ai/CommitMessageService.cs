using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Ai;

internal sealed class CommitMessageService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService,
    DiffService diffService,
    ILogger<CommitMessageService> logger) : ICommitMessageService
{
    private const int RecentCommitsForExamples = 5;

    public async IAsyncEnumerable<string> StreamCommitMessageAsync(
        string repoId,
        int? linkedIssueNumber = null,
        string? linkedIssueTitle = null,
        string? linkedIssueBody = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var diff = diffService.BuildStagedDiff(repoId);
        var recentCommits = GetRecentCommitMessages(repoId);

        var messages = new List<ChatMessage>
        {
            new() { Role = "system", Content = BuildSystemPrompt() },
        };

        var stylePrompt = BuildStylePrompt(recentCommits);
        if (stylePrompt is not null)
            messages.Add(new() { Role = "user", Content = stylePrompt });

        var issueContext = BuildIssueContextPrompt(linkedIssueNumber, linkedIssueTitle, linkedIssueBody);
        if (issueContext is not null)
            messages.Add(new() { Role = "user", Content = issueContext });

        messages.Add(new() { Role = "user", Content = BuildUserPrompt(diff) });

        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
            yield return token;
    }

    private static string BuildSystemPrompt()
    {
        var sb = new StringBuilder();
        sb.AppendLine("Du bist ein präziser Git-Assistent. Deine einzige Aufgabe ist es, eine einzelne Commit-Nachricht zu generieren.");
        sb.AppendLine();
        sb.AppendLine("AUSGABE-REGELN (strikt einhalten):");
        sb.AppendLine("- Gib NUR die Commit-Nachricht aus — keine Erklärung, kein Kommentar, keine Alternativen");
        sb.AppendLine("- Keine Markdown-Formatierung (keine Backticks, kein **, keine Überschriften)");
        sb.AppendLine("- Kein einleitender Satz wie 'Hier ist die Commit-Nachricht:' oder ähnliches");
        sb.AppendLine("- Beginne sofort mit dem Typ, z.B. 'feat(' oder 'fix:'");
        sb.AppendLine();
        sb.AppendLine("FORMAT (Conventional Commits):");
        sb.AppendLine("  <type>(<scope>): <subject>");
        sb.AppendLine();
        sb.AppendLine("  [optionaler Body — nur bei komplexen Änderungen, die Kontext benötigen]");
        sb.AppendLine();
        sb.AppendLine("TYPEN: feat, fix, refactor, docs, test, chore, style, perf, ci, build");
        sb.AppendLine();
        sb.AppendLine("INHALT-REGELN:");
        sb.AppendLine("- Subject: max. 72 Zeichen, Imperativ ('add' nicht 'added'), kein Punkt am Ende");
        sb.AppendLine("- Scope: optional, beschreibt das Modul/die Komponente (z.B. 'api', 'ui', 'auth')");
        sb.AppendLine("- Body: nur wenn der Diff allein nicht erklärt warum — nicht was");
        sb.AppendLine("- Keine Issue-Referenzen hinzufügen");
        return sb.ToString().TrimEnd();
    }

    private static string? BuildStylePrompt(IReadOnlyList<string> recentCommits)
    {
        if (recentCommits.Count == 0)
            return null;

        var sb = new StringBuilder();
        sb.AppendLine("STIL-VORGABE (übernimm Sprache, Scope-Stil und Detailgrad aus diesen Beispielen):");
        foreach (var msg in recentCommits)
            sb.AppendLine($"  {msg}");
        return sb.ToString().TrimEnd();
    }

    private static string? BuildIssueContextPrompt(int? linkedIssueNumber, string? linkedIssueTitle, string? linkedIssueBody)
    {
        if (!linkedIssueNumber.HasValue || string.IsNullOrWhiteSpace(linkedIssueTitle))
            return null;

        var sb = new StringBuilder();
        sb.AppendLine($"FEATURE-KONTEXT (Issue #{linkedIssueNumber}: {linkedIssueTitle}):");
        if (!string.IsNullOrWhiteSpace(linkedIssueBody))
            sb.AppendLine(linkedIssueBody.Trim());

        return sb.ToString().TrimEnd();
    }

    private static string BuildUserPrompt(string diff)
    {
        if (string.IsNullOrWhiteSpace(diff))
            return "Es gibt keine gestageten Änderungen.";

        var sb = new StringBuilder();
        sb.AppendLine("Erstelle eine Commit-Nachricht für den folgenden Staged-Diff:");
        sb.AppendLine(diff);
        return sb.ToString().TrimEnd();
    }

    private IReadOnlyList<string> GetRecentCommitMessages(string repoId)
    {
        try
        {
            return repositoryService
                .GetHistory(repoId, limit: RecentCommitsForExamples)
                .Select(c => c.Message)
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Letzte Commits konnten nicht geladen werden für Repo {RepoId}.", repoId);
            return [];
        }
    }
}
