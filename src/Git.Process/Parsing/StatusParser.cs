using Git.Process.Repository.Models;

namespace Git.Process.Parsing;

internal static class StatusParser
{
    // Parses output of: git status --porcelain=v1
    // Format: XY PATH or XY PATH -> ORIG_PATH (for renames)
    // X = index (staged), Y = worktree (unstaged)
    public static GitStatusResult Parse(string output)
    {
        var staged = new List<GitStatusEntry>();
        var unstaged = new List<GitStatusEntry>();

        if (string.IsNullOrWhiteSpace(output))
            return new GitStatusResult { Staged = staged, Unstaged = unstaged };

        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            if (line.Length < 4) continue;

            var x = line[0]; // index status
            var y = line[1]; // worktree status
            var path = line[3..].Trim();

            string filePath;
            string? oldFilePath = null;

            if (path.Contains(" -> "))
            {
                var parts = path.Split(" -> ", 2);
                filePath = parts[0].Trim();
                oldFilePath = parts[1].Trim();
            }
            else
            {
                filePath = path;
            }

            if (x != ' ' && x != '?')
            {
                var status = MapStatus(x);
                if (status is not null)
                    staged.Add(new GitStatusEntry { FilePath = filePath, OldFilePath = oldFilePath, Status = status, IsStaged = true });
            }

            if (y != ' ')
            {
                var status = MapWorkdirStatus(y);
                if (status is not null)
                    unstaged.Add(new GitStatusEntry { FilePath = filePath, Status = status, IsStaged = false });
            }
        }

        return new GitStatusResult { Staged = staged, Unstaged = unstaged };
    }

    public static bool IsUntracked(string output, string filePath) =>
        Parse(output).Unstaged.Any(e => e.FilePath == filePath && e.Status == "Untracked");

    private static string? MapStatus(char c) => c switch
    {
        'A' => "Added",
        'M' => "Modified",
        'D' => "Deleted",
        'R' => "Renamed",
        'C' => "Added",
        _ => null
    };

    private static string? MapWorkdirStatus(char c) => c switch
    {
        'M' => "Modified",
        'D' => "Deleted",
        '?' => "Untracked",
        'R' => "Renamed",
        _ => null
    };
}
