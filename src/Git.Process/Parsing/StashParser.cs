using Git.Process.Stash.Models;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Git.Process.Parsing;

internal static partial class StashParser
{
    // Parses output of:
    // git stash list --format=%gd%x00%s%x00%aI
    // %gd = stash@{N}, %s = subject, %aI = ISO 8601 author date
    public static IReadOnlyList<GitStashEntry> Parse(string output)
    {
        if (string.IsNullOrWhiteSpace(output))
            return [];

        var entries = new List<GitStashEntry>();

        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = line.Split('\0');
            if (parts.Length < 3) continue;

            var indexMatch = StashIndexRegex().Match(parts[0].Trim());
            if (!indexMatch.Success) continue;

            var index = int.Parse(indexMatch.Groups[1].Value);
            var raw = parts[1].Trim();
            var date = DateTimeOffset.Parse(parts[2].Trim(), null, DateTimeStyles.RoundtripKind);

            ParseStashMessage(raw, out var branch, out var message);

            entries.Add(new GitStashEntry
            {
                Index = index,
                Message = message,
                Branch = branch,
                CreatedAt = date
            });
        }

        return entries;
    }

    // Git stash messages are formatted as:
    //   "On <branch>: <user message>"       (when -m is provided)
    //   "WIP on <branch>: <sha> <commit>"   (auto-generated)
    private static void ParseStashMessage(string raw, out string branch, out string message)
    {
        var onMatch = OnRegex().Match(raw);
        if (onMatch.Success)
        {
            branch = onMatch.Groups[1].Value;
            message = onMatch.Groups[2].Value;
            return;
        }
        var wipMatch = WipRegex().Match(raw);
        if (wipMatch.Success)
        {
            branch = wipMatch.Groups[1].Value;
            message = wipMatch.Groups[2].Value;
            return;
        }
        branch = string.Empty;
        message = raw;
    }

    [GeneratedRegex(@"^stash@\{(\d+)\}$")]
    private static partial Regex StashIndexRegex();

    [GeneratedRegex(@"^On (.+?): (.+)$")]
    private static partial Regex OnRegex();

    [GeneratedRegex(@"^WIP on (.+?): \S+ (.+)$")]
    private static partial Regex WipRegex();
}
