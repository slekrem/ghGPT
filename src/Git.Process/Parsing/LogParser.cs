using Git.Process.Repository.Models;
using System.Globalization;

namespace Git.Process.Parsing;

internal static class LogParser
{
    // Parses output of:
    // git log --format=%H%x00%s%x00%an%x00%ae%x00%aI
    // Fields separated by NUL, records separated by newline
    public static IReadOnlyList<GitCommitEntry> ParseEntries(string output)
    {
        if (string.IsNullOrWhiteSpace(output))
            return [];

        var entries = new List<GitCommitEntry>();

        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = line.Split('\0');
            if (parts.Length < 5) continue;

            entries.Add(new GitCommitEntry
            {
                Sha = parts[0].Trim(),
                Message = parts[1].Trim(),
                AuthorName = parts[2].Trim(),
                AuthorEmail = parts[3].Trim(),
                AuthorDate = ParseDate(parts[4].Trim())
            });
        }

        return entries;
    }

    // Parses output of:
    // git log -1 --format=%H%x00%s%x00%an%x00%ae%x00%aI {sha}  (metadata)
    // git log -1 --format=%B {sha}  (full message, separate call)
    public static (string Sha, string Message, string AuthorName, string AuthorEmail, DateTimeOffset AuthorDate)
        ParseSingleEntry(string metaOutput)
    {
        var parts = metaOutput.Trim().Split('\0');
        if (parts.Length < 5)
            throw new InvalidOperationException("Ungültiges Log-Format.");

        return (
            Sha: parts[0].Trim(),
            Message: parts[1].Trim(),
            AuthorName: parts[2].Trim(),
            AuthorEmail: parts[3].Trim(),
            AuthorDate: ParseDate(parts[4].Trim())
        );
    }

    private static DateTimeOffset ParseDate(string value) =>
        DateTimeOffset.Parse(value, null, DateTimeStyles.RoundtripKind);
}
