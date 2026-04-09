using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Ai;

internal sealed class CommitMessageService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService) : ICommitMessageService
{
    private const int RecentCommitsForExamples = 5;

    public async IAsyncEnumerable<string> StreamCommitMessageAsync(
        string repoId,
        int? linkedIssueNumber = null,
        string? linkedIssueTitle = null,
        string? linkedIssueBody = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var diff = BuildStagedDiff(repoId);
        var recentCommits = GetRecentCommitMessages(repoId);

        var messages = new List<ChatMessage>
        {
            new() { Role = "system", Content = BuildSystemPrompt(recentCommits, linkedIssueNumber, linkedIssueTitle, linkedIssueBody) },
            new() { Role = "user", Content = BuildUserPrompt(diff, recentCommits) }
        };

        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
            yield return token;
    }

    private string BuildSystemPrompt(
        IReadOnlyList<string> recentCommits,
        int? linkedIssueNumber,
        string? linkedIssueTitle,
        string? linkedIssueBody)
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

        if (linkedIssueNumber.HasValue && !string.IsNullOrWhiteSpace(linkedIssueTitle))
        {
            sb.AppendLine();
            sb.AppendLine($"FEATURE-KONTEXT (Issue #{linkedIssueNumber}: {linkedIssueTitle}):");
            if (!string.IsNullOrWhiteSpace(linkedIssueBody))
                sb.AppendLine(linkedIssueBody.Trim());
        }

        if (recentCommits.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("STIL-VORGABE (übernimm Sprache, Scope-Stil und Detailgrad aus diesen Beispielen):");
            foreach (var msg in recentCommits)
                sb.AppendLine($"  {msg}");
        }

        return sb.ToString().TrimEnd();
    }

    private static string BuildUserPrompt(string diff, IReadOnlyList<string> recentCommits)
    {
        if (string.IsNullOrWhiteSpace(diff))
            return "Es gibt keine gestageten Änderungen.";

        var sb = new StringBuilder();
        sb.AppendLine("Erstelle eine Commit-Nachricht für den folgenden Staged-Diff.");

        if (recentCommits.Count > 0)
            sb.AppendLine("Halte dich dabei an den Stil der bisherigen Commits aus dem System-Prompt.");

        sb.AppendLine();
        sb.AppendLine("Staged-Diff:");
        sb.AppendLine(diff);

        return sb.ToString().TrimEnd();
    }

    private string BuildStagedDiff(string repoId)
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
                catch { /* Datei überspringen */ }
            }
            return sb.ToString().TrimEnd();
        }
        catch
        {
            return string.Empty;
        }
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
        catch
        {
            return [];
        }
    }
}
