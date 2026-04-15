using Git.Process.Branch.Models;
using System.Text.RegularExpressions;

namespace Git.Process.Parsing;

internal static partial class BranchParser
{
    // Parses output of:
    // git for-each-ref --format=%(refname)%09%(HEAD)%09%(upstream:short)%09%(upstream:track,nobracket) refs/heads refs/remotes
    // Tab-separated fields, one ref per line.
    public static IReadOnlyList<GitBranchEntry> Parse(string output)
    {
        if (string.IsNullOrWhiteSpace(output))
            return [];

        var entries = new List<GitBranchEntry>();

        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = line.Split('\t');
            if (parts.Length < 2) continue;

            var refname = parts[0].Trim();
            var headMarker = parts[1].Trim();
            var upstream = parts.Length > 2 ? parts[2].Trim() : string.Empty;
            var track = parts.Length > 3 ? parts[3].Trim() : string.Empty;

            var isRemote = refname.StartsWith("refs/remotes/");
            var name = isRemote
                ? refname["refs/remotes/".Length..]
                : refname.StartsWith("refs/heads/")
                    ? refname["refs/heads/".Length..]
                    : refname;

            if (isRemote && name.EndsWith("/HEAD"))
                continue;

            var (ahead, behind) = ParseTracking(track);

            entries.Add(new GitBranchEntry
            {
                Name = name,
                IsRemote = isRemote,
                IsHead = headMarker == "*",
                AheadBy = ahead,
                BehindBy = behind,
                TrackingBranch = string.IsNullOrWhiteSpace(upstream) ? null : upstream
            });
        }

        return entries
            .OrderBy(b => b.IsRemote)
            .ThenBy(b => b.Name)
            .ToList();
    }

    private static (int Ahead, int Behind) ParseTracking(string track)
    {
        if (string.IsNullOrWhiteSpace(track)) return (0, 0);

        var ahead = 0;
        var behind = 0;

        var aheadMatch = AheadRegex().Match(track);
        if (aheadMatch.Success) int.TryParse(aheadMatch.Groups[1].Value, out ahead);

        var behindMatch = BehindRegex().Match(track);
        if (behindMatch.Success) int.TryParse(behindMatch.Groups[1].Value, out behind);

        return (ahead, behind);
    }

    [GeneratedRegex(@"ahead (\d+)")]
    private static partial Regex AheadRegex();

    [GeneratedRegex(@"behind (\d+)")]
    private static partial Regex BehindRegex();
}
