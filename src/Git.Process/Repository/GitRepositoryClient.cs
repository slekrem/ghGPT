using Git.Process.Abstractions;
using Git.Process.Parsing;
using Git.Process.Repository.Models;

namespace Git.Process.Repository;

internal class GitRepositoryClient(IGitRunner runner) : IGitRepositoryClient
{
    private const string LogFormat = "%H%x00%s%x00%an%x00%ae%x00%aI";

    public async Task<GitStatusResult> GetStatusAsync(string repoPath)
    {
        var output = await runner.RunAsync(repoPath, "status", "--porcelain=v1");
        return StatusParser.Parse(output);
    }

    public async Task<IReadOnlyList<GitCommitEntry>> GetHistoryAsync(string repoPath, int limit = 50)
    {
        try
        {
            var output = await runner.RunAsync(repoPath, "log", $"--format={LogFormat}", $"-n{limit}");
            return LogParser.ParseEntries(output);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("does not have any commits"))
        {
            return [];
        }
    }

    public async Task<GitCommitListResult> GetCommitsAsync(string repoPath, string? branch, int skip, int take)
    {
        var resolvedBranch = await ResolveBranchAsync(repoPath, branch);

        var args = new List<string> { "log", resolvedBranch, $"--format={LogFormat}", $"--skip={Math.Max(skip, 0)}", $"-n{Math.Max(take, 1) + 1}" };

        try
        {
            var output = await runner.RunAsync(repoPath, [.. args]);
            var entries = LogParser.ParseEntries(output).ToList();

            var hasMore = entries.Count > Math.Max(take, 1);
            if (hasMore) entries.RemoveAt(entries.Count - 1);

            return new GitCommitListResult { Branch = resolvedBranch, Commits = entries, HasMore = hasMore };
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("does not have any commits"))
        {
            return new GitCommitListResult { Branch = resolvedBranch, Commits = [], HasMore = false };
        }
    }

    public async Task<GitCommitDetail> GetCommitDetailAsync(string repoPath, string sha)
    {
        var metaOutput = await runner.RunAsync(repoPath, "log", "-1", $"--format={LogFormat}", sha);
        var fullMessage = await runner.RunAsync(repoPath, "log", "-1", "--format=%B", sha);
        var diffOutput = await runner.RunAsync(repoPath, "show", "--format=", sha);

        var (parsedSha, message, authorName, authorEmail, authorDate) = LogParser.ParseSingleEntry(metaOutput);
        var files = DiffParser.ParseCommitDiff(diffOutput);

        return new GitCommitDetail
        {
            Sha = parsedSha,
            Message = message,
            FullMessage = fullMessage.Trim(),
            AuthorName = authorName,
            AuthorEmail = authorEmail,
            AuthorDate = authorDate,
            Files = files
        };
    }

    public async Task<string> GetDiffAsync(string repoPath, string filePath, bool staged)
    {
        var statusOutput = await runner.RunAsync(repoPath, "status", "--porcelain=v1");

        if (!staged && StatusParser.IsUntracked(statusOutput, filePath))
            return BuildUntrackedFileDiff(repoPath, filePath);

        var args = staged
            ? new[] { "diff", "--cached", "--", filePath }
            : new[] { "diff", "--", filePath };

        var output = await runner.RunAsync(repoPath, args);
        return output.Replace("\r\n", "\n");
    }

    public async Task<string> GetCombinedDiffAsync(string repoPath, string filePath)
    {
        var statusOutput = await runner.RunAsync(repoPath, "status", "--porcelain=v1");

        if (StatusParser.IsUntracked(statusOutput, filePath))
            return BuildUntrackedFileDiff(repoPath, filePath);

        var output = await runner.RunAsync(repoPath, "diff", "HEAD", "--", filePath);
        return output.Replace("\r\n", "\n");
    }

    private async Task<string> ResolveBranchAsync(string repoPath, string? branch)
    {
        if (!string.IsNullOrWhiteSpace(branch))
            return branch;

        var head = await runner.RunAsync(repoPath, "rev-parse", "--abbrev-ref", "HEAD");
        return head.Trim();
    }

    private static string BuildUntrackedFileDiff(string repoPath, string filePath)
    {
        var fullPath = System.IO.Path.Combine(repoPath, filePath);
        if (!File.Exists(fullPath))
            return string.Empty;

        var content = File.ReadAllText(fullPath).Replace("\r\n", "\n");
        var lines = content.Split('\n');
        if (lines.Length > 0 && lines[^1] == string.Empty)
            lines = lines[..^1];

        var header = $"diff --git a/{filePath} b/{filePath}\nnew file mode 100644\n--- /dev/null\n+++ b/{filePath}\n";
        if (lines.Length == 0)
            return $"{header}@@ -0,0 +1,0 @@\n";

        var body = string.Join('\n', lines.Select(line => $"+{line}"));
        return $"{header}@@ -0,0 +1,{lines.Length} @@\n{body}\n";
    }
}
