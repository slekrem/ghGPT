namespace ghGPT.Core.PullRequests;

public interface IPullRequestService
{
    Task<IReadOnlyList<PullRequestListItem>> GetPullRequestsAsync(string owner, string repo, string state = "open");
    Task<PullRequestDetail> GetPullRequestDetailAsync(string owner, string repo, int number);
    Task CloseAsync(string owner, string repo, int number);
    Task ReopenAsync(string owner, string repo, int number);
    Task EditAsync(string owner, string repo, int number, string? title, string? body);
    Task MergeAsync(string owner, string repo, int number, string method, string? commitTitle, string? commitBody);
    Task<PullRequestDetail> CreateAsync(string owner, string repo, string title, string body, string headBranch, string baseBranch, bool draft);
    Task CreateReviewAsync(string owner, string repo, int number, string reviewEvent, string? body = null);
    Task AddCommentAsync(string owner, string repo, int number, string body);
}
