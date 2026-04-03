using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Infrastructure.Ai;

internal sealed class CodeReviewService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService,
    ILogger<CodeReviewService> logger) : ICodeReviewService
{
    public async IAsyncEnumerable<string> StreamReviewAsync(
        string repoId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var diff = BuildCombinedDiff(repoId);
        var reviewContext = LoadReviewContext(repoId);

        var messages = new[]
        {
            new ChatMessage { Role = "system", Content = SystemPrompt },
            new ChatMessage { Role = "user", Content = BuildUserPrompt(diff, reviewContext) }
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

        TESTS:
        - Prüfe ob neue public-Methoden oder Klassen im Diff zugehörige Tests haben
        - Falls im Diff neue Logik hinzugefügt wurde aber keine Test-Dateien geändert wurden: als 🟡 mittel melden
        - Falls bestehende Tests durch die Änderung ungültig werden könnten: als 🔴 kritisch melden
        """;

    private static string BuildUserPrompt(string diff, string? reviewContext)
    {
        if (string.IsNullOrWhiteSpace(diff))
            return "Es gibt keine Änderungen zum Reviewen.";

        if (string.IsNullOrWhiteSpace(reviewContext))
            return $"""
                Reviewe den folgenden Git-Diff:

                {diff}
                """;

        return $"""
            Berücksichtige folgenden Projekt-Kontext beim Review:

            {reviewContext}

            Reviewe den folgenden Git-Diff:

            {diff}
            """;
    }

    private string? LoadReviewContext(string repoId)
    {
        try
        {
            var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
            if (repo is null) return null;

            var reviewFile = Path.Combine(repo.LocalPath, "REVIEW.md");
            return File.Exists(reviewFile) ? File.ReadAllText(reviewFile) : null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "REVIEW.md konnte nicht geladen werden für Repo {RepoId}.", repoId);
            return null;
        }
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
