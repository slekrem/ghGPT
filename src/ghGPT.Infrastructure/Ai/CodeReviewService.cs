using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Infrastructure.Ai;

internal sealed class CodeReviewService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService) : ICodeReviewService
{
    public async IAsyncEnumerable<string> StreamReviewAsync(
        string repoId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var diff = BuildCombinedDiff(repoId);

        var messages = new[]
        {
            new ChatMessage { Role = "system", Content = SystemPrompt },
            new ChatMessage { Role = "user", Content = BuildUserPrompt(diff) }
        };

        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
            yield return token;
    }

    private const string SystemPrompt =
        """
        Du bist ein erfahrener Code-Reviewer. Deine Aufgabe ist es, Git-Diffs präzise und konstruktiv zu analysieren.

        AUSGABE-FORMAT (Markdown, strikt einhalten):
        ## Zusammenfassung
        Ein oder zwei Sätze über den Zweck der Änderungen.

        ## Probleme
        Gefundene Bugs, Sicherheitslücken oder Logikfehler — sortiert nach Schwere (🔴 kritisch, 🟡 mittel, 🔵 hinweis).
        Falls keine Probleme gefunden: "Keine Probleme gefunden."

        ## Verbesserungsvorschläge
        Konkrete Vorschläge zur Code-Qualität, Lesbarkeit oder Performance.
        Falls keine Verbesserungen nötig: "Keine weiteren Verbesserungen."

        REGELN:
        - Beziehe dich immer auf konkrete Zeilen oder Dateinamen aus dem Diff
        - Keine allgemeinen Platitüden ("guter Code", "sieht gut aus")
        - Kein Kommentar zu Dingen die nicht im Diff sind
        - Antworte auf Deutsch
        """;

    private static string BuildUserPrompt(string diff)
    {
        if (string.IsNullOrWhiteSpace(diff))
            return "Es gibt keine Änderungen zum Reviewen.";

        return $"""
            Reviewe den folgenden Git-Diff:

            {diff}
            """;
    }

    private string BuildCombinedDiff(string repoId)
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
                catch { /* Datei überspringen */ }
            }
            return sb.ToString().TrimEnd();
        }
        catch
        {
            return string.Empty;
        }
    }
}
