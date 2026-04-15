using Git.Process.Abstractions;
using Git.Process.Parsing;
using Git.Process.Repository.Models;

namespace Git.Process.Repository;

internal class GitRepositoryClient(IGitRunner runner) : IGitRepositoryClient
{
    public async Task<GitStatusResult> GetStatusAsync(string repoPath)
    {
        var output = await runner.RunAsync(repoPath, "status", "--porcelain=v1");
        return StatusParser.Parse(output);
    }
}
