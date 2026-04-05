using GhCli.Net.Abstractions;
using ghGPT.Core.PullRequests;
using System.Text.RegularExpressions;

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

    public async Task<PullRequestDetail> GetPullRequestDetailAsync(string owner, string repo, int number)
    {
        var pr = await pullRequestClient.GetDetailAsync(owner, repo, number);

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

        return new PullRequestDetail
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

    public static (string Owner, string Repo) ParseRemoteUrl(string remoteUrl)
    {
        var match = Regex.Match(remoteUrl,
            @"(?:https://github\.com/|git@github\.com:)([^/]+)/([^/\.]+?)(?:\.git)?$");

        if (!match.Success)
            throw new InvalidOperationException("Dieses Repository ist kein GitHub-Repository.");

        return (match.Groups[1].Value, match.Groups[2].Value);
    }
}
