using GhCli.Net.PullRequests.Models;

namespace GhCli.Net.Abstractions;

public interface IPullRequestClient
{
    Task<IReadOnlyList<PullRequest>> ListAsync(string owner, string repo, string state = "open", int limit = 100);
    Task<PullRequestDetail> GetDetailAsync(string owner, string repo, int number);
    Task AddCommentAsync(string owner, string repo, int number, string body);
    Task CreateReviewAsync(string owner, string repo, int number, PullRequestReviewEvent reviewEvent, string? body = null);
    Task<IReadOnlyList<PullRequestStatusCheck>> GetChecksAsync(string owner, string repo, int number);
}
