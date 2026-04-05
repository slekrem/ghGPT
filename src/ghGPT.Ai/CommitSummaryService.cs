using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Ai;

internal sealed class CommitSummaryService(
    IOllamaClient ollamaClient,
    IRepositoryService repositoryService) : ICommitSummaryService
{
    private const string SystemPrompt =
        """
        Du bist ein technischer Redakteur. Deine Aufgabe ist es, Git-Commit-Listen präzise zusammenzufassen.

        AUSGABE-REGELN:
        - Antworte auf Deutsch
        - 3–5 Sätze, fließender Text — keine Aufzählungsliste
        - Fokus auf Gesamtfortschritt und wichtige Änderungen, nicht auf jedes Detail
        - Zielgruppe: technisches Team im Stand-up oder Release-Notes
        - Kein Einleitungssatz wie "Hier ist die Zusammenfassung:" — beginne direkt mit dem Inhalt
        - Keine Markdown-Formatierung
        """;

    public async IAsyncEnumerable<string> StreamSummaryAsync(
        string repoId,
        int count = 10,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var commits = GetCommitMessages(repoId, count);

        var messages = new[]
        {
            new ChatMessage { Role = "system", Content = SystemPrompt },
            new ChatMessage { Role = "user", Content = BuildUserPrompt(commits) }
        };

        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
            yield return token;
    }

    private IReadOnlyList<string> GetCommitMessages(string repoId, int count)
    {
        try
        {
            return repositoryService
                .GetHistory(repoId, limit: Math.Clamp(count, 1, 50))
                .Select(c => c.Message)
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    private static string BuildUserPrompt(IReadOnlyList<string> commits)
    {
        if (commits.Count == 0)
            return "Es sind keine Commits vorhanden.";

        var sb = new StringBuilder();
        sb.AppendLine($"Fasse die folgenden {commits.Count} Commits zusammen:");
        sb.AppendLine();
        for (var i = 0; i < commits.Count; i++)
            sb.AppendLine($"{i + 1}. {commits[i]}");

        return sb.ToString().TrimEnd();
    }
}
