using Git.Process.Repository.Models;

namespace Git.Process.Parsing;

internal static class DiffParser
{
    // Parses output of: git show --format= {sha}
    // Splits on "diff --git" sections and extracts per-file changes
    public static IReadOnlyList<GitCommitFileChange> ParseCommitDiff(string diffOutput)
    {
        if (string.IsNullOrWhiteSpace(diffOutput))
            return [];

        var result = new List<GitCommitFileChange>();
        var sections = SplitIntoFileSections(diffOutput);

        foreach (var section in sections)
        {
            var change = ParseFileSection(section);
            if (change is not null)
                result.Add(change);
        }

        return result;
    }

    private static IEnumerable<string> SplitIntoFileSections(string diffOutput)
    {
        var lines = diffOutput.Split('\n');
        var current = new List<string>();

        foreach (var line in lines)
        {
            if (line.StartsWith("diff --git ") && current.Count > 0)
            {
                yield return string.Join('\n', current);
                current.Clear();
            }
            current.Add(line);
        }

        if (current.Count > 0)
            yield return string.Join('\n', current);
    }

    private static GitCommitFileChange? ParseFileSection(string section)
    {
        if (!section.StartsWith("diff --git "))
            return null;

        var lines = section.Split('\n');

        var status = DetermineStatus(lines);
        var (filePath, oldFilePath) = ExtractPaths(lines, status);
        var (additions, deletions) = CountChanges(lines);

        return new GitCommitFileChange
        {
            Path = filePath,
            OldPath = oldFilePath,
            Status = status,
            Additions = additions,
            Deletions = deletions,
            Patch = section
        };
    }

    private static string DetermineStatus(string[] lines)
    {
        foreach (var line in lines)
        {
            if (line.StartsWith("new file mode")) return "Added";
            if (line.StartsWith("deleted file mode")) return "Deleted";
            if (line.StartsWith("rename from")) return "Renamed";
        }
        return "Modified";
    }

    private static (string FilePath, string? OldFilePath) ExtractPaths(string[] lines, string status)
    {
        if (status == "Renamed")
        {
            string? from = null;
            string? to = null;
            foreach (var line in lines)
            {
                if (line.StartsWith("rename from ")) from = line["rename from ".Length..].Trim();
                if (line.StartsWith("rename to ")) to = line["rename to ".Length..].Trim();
            }
            return (to ?? string.Empty, from);
        }

        // Extract from "diff --git a/path b/path"
        var diffLine = lines[0];
        var bIndex = diffLine.LastIndexOf(" b/");
        if (bIndex > 0)
        {
            var path = diffLine[(bIndex + 3)..].Trim();
            return (path, null);
        }

        return (string.Empty, null);
    }

    private static (int Additions, int Deletions) CountChanges(string[] lines)
    {
        var additions = 0;
        var deletions = 0;

        foreach (var line in lines)
        {
            if (line.StartsWith('+') && !line.StartsWith("+++")) additions++;
            else if (line.StartsWith('-') && !line.StartsWith("---")) deletions++;
        }

        return (additions, deletions);
    }
}
