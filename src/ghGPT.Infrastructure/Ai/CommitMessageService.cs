using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Infrastructure.Ai;

internal sealed class CommitMessageService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService) : ICommitMessageService
{
    public async IAsyncEnumerable<string> StreamCommitMessageAsync(
        string repoId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var diff = BuildStagedDiff(repoId);

        var prompt = string.IsNullOrWhiteSpace(diff)
            ? "Es gibt keine gestageten Änderungen. Bitte stage zuerst Dateien."
            : BuildPrompt(diff);

        var messages = new[]
        {
            new ChatMessage
            {
                Role = "system",
                Content = "Du bist ein Git-Experte. Antworte ausschließlich mit der Commit-Nachricht — kein Kommentar, keine Erklärung, kein Markdown-Block."
            },
            new ChatMessage { Role = "user", Content = prompt }
        };

        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
            yield return token;
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

    private static string BuildPrompt(string diff) =>
        $"""
        Analysiere den folgenden Git-Diff und erstelle eine präzise Commit-Nachricht nach Conventional Commits.

        Format:
        <type>(<scope>): <subject>

        [optionaler Body mit weiteren Details, falls nötig]

        Typen: feat, fix, refactor, docs, test, chore, style, perf, ci

        Regeln:
        - Subject max. 72 Zeichen, Imperativ, kein Punkt am Ende
        - Scope optional, aber hilfreich (z.B. Dateiname oder Modul)
        - Body nur wenn wirklich nötig
        - Kein Markdown, keine Anführungszeichen, keine Erklärung

        Diff:
        {diff}
        """;
}
