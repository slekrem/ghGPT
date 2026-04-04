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
    private const string SessionFileName = ".review-session.md";
    private const string LastReviewFileName = ".review-last.md";

    public async IAsyncEnumerable<string> StreamReviewAsync(
        string repoId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var diff = BuildCombinedDiff(repoId);
        var reviewContext = LoadFileContext(repoId, "REVIEW.md");
        var sessionContext = LoadFileContext(repoId, SessionFileName);

        var messages = new[]
        {
            new ChatMessage { Role = "system", Content = SystemPrompt },
            new ChatMessage { Role = "user", Content = BuildUserPrompt(diff, reviewContext, sessionContext) }
        };

        var fullReview = new StringBuilder();
        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
        {
            fullReview.Append(token);
            yield return token;
        }

        SaveLastReview(repoId, fullReview.ToString());
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

        ## Ohne Befunde
        Dateien aus dem Diff, für die keine Probleme oder Verbesserungen gefunden wurden.
        Diese können unabhängig committet werden.
        Falls alle Dateien Befunde haben: weglassen.

        REGELN:
        - Beziehe dich immer auf konkrete Zeilen oder Dateinamen aus dem Diff
        - Keine allgemeinen Platitüden ("guter Code", "sieht gut aus")
        - Kein Kommentar zu Dingen die nicht im Diff sind
        - Antworte auf Deutsch
        - Ein Review ohne Findings ist ein gutes Review — es ist ausdrücklich korrekt, nichts zu melden
        - Ein falsches Finding ist schlimmer als kein Finding
        - Prüfe die Sichtbarkeit (private/internal/public) BEVOR fehlende Tests gemeldet werden
        - Schlage keine Abstraktionen oder Hilfsfunktionen vor, die nur einmal verwendet werden
        - Melde keine hypothetischen Performance-Probleme ohne konkreten, messbaren Anhalt
        - Validierungen die das Framework, die Runtime oder ein externes Tool selbst übernimmt, nicht doppelt fordern
        - Fehlerbehandlung die bewusst weit gefasst ist (z. B. catch-all für optionale Operationen), nicht als Bug werten

        TESTS:
        - Nur öffentliche Methoden/Klassen benötigen direkte Tests — nicht-öffentliche werden indirekt abgedeckt
        - Falls neue öffentliche Logik ohne Test-Dateiänderung hinzugefügt wurde: als 🔵 hinweis melden
        - Falls bestehende Tests durch die Änderung ungültig werden könnten: als 🔴 kritisch melden
        """;

    private static string BuildUserPrompt(string diff, string? reviewContext, string? sessionContext)
    {
        if (string.IsNullOrWhiteSpace(diff))
            return "Es gibt keine Änderungen zum Reviewen.";

        var sb = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(reviewContext))
        {
            sb.AppendLine("## Projekt-Kontext (REVIEW.md)");
            sb.AppendLine(reviewContext);
            sb.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(sessionContext))
        {
            sb.AppendLine("## Review-Session-Feedback (.review-session.md)");
            sb.AppendLine(sessionContext);
            sb.AppendLine();
        }

        sb.AppendLine("## Git-Diff");
        sb.AppendLine(diff);

        return sb.ToString();
    }

    private void SaveLastReview(string repoId, string content)
    {
        try
        {
            var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
            if (repo is null) return;

            var filePath = Path.Combine(repo.LocalPath, LastReviewFileName);
            File.WriteAllText(filePath, content);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{FileName} konnte nicht gespeichert werden für Repo {RepoId}.", LastReviewFileName, repoId);
        }
    }

    private string? LoadFileContext(string repoId, string fileName)
    {
        try
        {
            var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
            if (repo is null) return null;

            var filePath = Path.Combine(repo.LocalPath, fileName);
            return File.Exists(filePath) ? File.ReadAllText(filePath) : null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{FileName} konnte nicht geladen werden für Repo {RepoId}.", fileName, repoId);
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
