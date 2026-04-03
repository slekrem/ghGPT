using GhCli.Net.PullRequests.Models;

namespace GhCli.Net.Abstractions;

public interface IPullRequestClient
{
    Task<IReadOnlyList<PullRequest>> ListAsync(string owner, string repo, string state = "open", int limit = 100);
    Task<PullRequestDetail> GetDetailAsync(string owner, string repo, int number);
}
