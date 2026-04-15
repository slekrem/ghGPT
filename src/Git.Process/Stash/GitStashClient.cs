using Git.Process.Abstractions;
using Git.Process.Parsing;
using Git.Process.Repository.Models;
using Git.Process.Stash.Models;

namespace Git.Process.Stash;

internal class GitStashClient(IGitRunner runner) : IGitStashClient
{
    private const string StashFormat = "%gd%x00%s%x00%aI";

    public async Task<IReadOnlyList<GitStashEntry>> GetStashesAsync(string repoPath)
    {
        var output = await runner.RunAsync(repoPath, "stash", "list", $"--format={StashFormat}");
        return StashParser.Parse(output);
    }

    public async Task<IReadOnlyList<GitCommitFileChange>> GetStashDiffAsync(string repoPath, int index)
    {
        var stashRef = $"stash@{{{index}}}";

        // git stash show -p stash@{N} produces a diff against the parent
        var diffOutput = await runner.RunAsync(repoPath, "stash", "show", "-p", stashRef);
        return DiffParser.ParseCommitDiff(diffOutput);
    }

    public async Task PushStashAsync(string repoPath, string? message, string[]? paths)
    {
        var args = new List<string> { "stash", "push" };

        if (!string.IsNullOrWhiteSpace(message))
        {
            args.Add("-m");
            args.Add(message);
        }

        if (paths is { Length: > 0 })
        {
            args.Add("--");
            args.AddRange(paths);
        }

        await runner.RunAsync(repoPath, [.. args]);
    }

    public Task PopStashAsync(string repoPath, int index) =>
        runner.RunAsync(repoPath, "stash", "pop", $"stash@{{{index}}}");

    public Task DropStashAsync(string repoPath, int index) =>
        runner.RunAsync(repoPath, "stash", "drop", $"stash@{{{index}}}");
}
