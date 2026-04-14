using GhCli.Net.Abstractions;
using GhCli.Net.PullRequests.Models;
using ghGPT.Core.PullRequests;
using CoreDetail = ghGPT.Core.PullRequests.PullRequestDetail;

namespace ghGPT.Infrastructure.PullRequests;

public class PullRequestService(IPullRequestClient pullRequestClient) : IPullRequestService
{
    public async Task<IReadOnlyList<PullRequestListItem>> GetPullRequestsAsync(
        string owner, string repo, string state = "open")
    {
        var prs = await pullRequestClient.ListAsync(owner, repo, state);

        return prs.Select(pr => new PullRequestListItem
        {
            Number = pr.Number,
            Title = pr.Title,
            State = pr.State,
            AuthorLogin = pr.Author.Login,
            AuthorAvatarUrl = string.Empty,
            HeadBranch = pr.HeadRefName,
            BaseBranch = pr.BaseRefName,
            IsDraft = pr.IsDraft,
            MergeableState = pr.Mergeable,
            Labels = pr.Labels.Select(l => l.Name).ToList(),
            CreatedAt = pr.CreatedAt,
            UpdatedAt = pr.UpdatedAt,
            HtmlUrl = pr.Url
        }).ToList();
    }

    public async Task<CoreDetail> GetPullRequestDetailAsync(string owner, string repo, int number)
    {
        var pr = await pullRequestClient.GetDetailAsync(owner, repo, number);
        return MapDetail(pr);
    }

    public Task CloseAsync(string owner, string repo, int number) =>
        pullRequestClient.CloseAsync(owner, repo, number);

    public Task ReopenAsync(string owner, string repo, int number) =>
        pullRequestClient.ReopenAsync(owner, repo, number);

    public Task EditAsync(string owner, string repo, int number, string? title, string? body) =>
        pullRequestClient.EditAsync(owner, repo, number, title, body);

    public Task MergeAsync(string owner, string repo, int number, string method, string? commitTitle, string? commitBody)
    {
        var mergeMethod = method.ToLowerInvariant() switch
        {
            "squash" => PullRequestMergeMethod.Squash,
            "rebase" => PullRequestMergeMethod.Rebase,
            _ => PullRequestMergeMethod.Merge
        };
        return pullRequestClient.MergeAsync(owner, repo, number, mergeMethod, commitTitle, commitBody);
    }

    public async Task<CoreDetail> CreateAsync(string owner, string repo, string title, string body, string headBranch, string baseBranch, bool draft)
    {
        var pr = await pullRequestClient.CreateAsync(owner, repo, title, body, headBranch, baseBranch, draft);
        return MapDetail(pr);
    }

    public Task CreateReviewAsync(string owner, string repo, int number, string reviewEvent, string? body = null)
    {
        var evt = reviewEvent.ToLowerInvariant() switch
        {
            "request_changes" => PullRequestReviewEvent.RequestChanges,
            "comment" => PullRequestReviewEvent.Comment,
            _ => PullRequestReviewEvent.Approve
        };
        return pullRequestClient.CreateReviewAsync(owner, repo, number, evt, body);
    }

    private static CoreDetail MapDetail(GhCli.Net.PullRequests.Models.PullRequestDetail pr)
    {
        var reviews = pr.Reviews
            .Select(r => new Core.PullRequests.PullRequestReview
            {
                ReviewerLogin = r.Author.Login,
                ReviewerAvatarUrl = string.Empty,
                State = r.State,
                SubmittedAt = r.SubmittedAt
            }).ToList();

        var files = pr.Files
            .Select(f => new Core.PullRequests.PullRequestFile
            {
                FileName = f.Path,
                Status = f.ChangeType,
                Additions = f.Additions,
                Deletions = f.Deletions,
                Changes = f.Changes
            }).ToList();

        return new CoreDetail
        {
            Number = pr.Number,
            Title = pr.Title,
            State = pr.State,
            AuthorLogin = pr.Author.Login,
            AuthorAvatarUrl = string.Empty,
            HeadBranch = pr.HeadRefName,
            BaseBranch = pr.BaseRefName,
            IsDraft = pr.IsDraft,
            Body = pr.Body,
            Labels = pr.Labels.Select(l => l.Name).ToList(),
            Reviews = reviews,
            Files = files,
            CiPassing = pr.CiPassing,
            CiHasCombinedStatus = pr.CiHasCombinedStatus,
            HtmlUrl = pr.Url,
            CreatedAt = pr.CreatedAt,
            UpdatedAt = pr.UpdatedAt
        };
    }
}
