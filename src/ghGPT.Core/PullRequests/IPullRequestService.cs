namespace ghGPT.Core.PullRequests;

public interface IPullRequestService
{
    Task<IReadOnlyList<PullRequestListItem>> GetPullRequestsAsync(string owner, string repo, string state = "open");
    Task<PullRequestDetail> GetPullRequestDetailAsync(string owner, string repo, int number);
}
