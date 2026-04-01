using ghGPT.Core.PullRequests;
using ghGPT.Infrastructure.Account;
using Octokit;
using System.Text.RegularExpressions;

namespace ghGPT.Infrastructure.PullRequests;

public class PullRequestService(ITokenStore tokenStore) : IPullRequestService
{
    private const string GitHubProductHeader = "ghGPT";

    public async Task<IReadOnlyList<PullRequestListItem>> GetPullRequestsAsync(
        string owner, string repo, string state = "open")
    {
        var client = CreateClient();

        var prState = state switch
        {
            "closed" => ItemStateFilter.Closed,
            "all" => ItemStateFilter.All,
            _ => ItemStateFilter.Open
        };

        try
        {
            var prs = await client.PullRequest.GetAllForRepository(owner, repo, new PullRequestRequest
            {
                State = prState
            }, new ApiOptions { PageSize = 100 });

            return prs.Select(pr => new PullRequestListItem
            {
                Number = pr.Number,
                Title = pr.Title,
                State = pr.Merged ? "merged" : pr.State.StringValue,
                AuthorLogin = pr.User?.Login ?? string.Empty,
                AuthorAvatarUrl = pr.User?.AvatarUrl ?? string.Empty,
                HeadBranch = pr.Head?.Ref ?? string.Empty,
                BaseBranch = pr.Base?.Ref ?? string.Empty,
                IsDraft = pr.Draft,
                MergeableState = pr.MergeableState?.StringValue,
                Labels = pr.Labels?.Select(l => l.Name).ToList() ?? [],
                CreatedAt = pr.CreatedAt,
                UpdatedAt = pr.UpdatedAt,
                HtmlUrl = pr.HtmlUrl
            }).ToList();
        }
        catch (AuthorizationException)
        {
            throw new InvalidOperationException("Kein gültiger GitHub-Account verbunden.");
        }
        catch (NotFoundException)
        {
            throw new InvalidOperationException("Repository nicht gefunden oder kein Zugriff.");
        }
        catch (RateLimitExceededException)
        {
            throw new InvalidOperationException("GitHub API Rate Limit erreicht. Bitte später erneut versuchen.");
        }
        catch (ApiException ex)
        {
            throw new InvalidOperationException($"GitHub API Fehler: {ex.Message}");
        }
    }

    public async Task<PullRequestDetail> GetPullRequestDetailAsync(string owner, string repo, int number)
    {
        var client = CreateClient();

        try
        {
            var pr = await client.PullRequest.Get(owner, repo, number);

            var reviewsTask = client.PullRequest.Review.GetAll(owner, repo, number);
            var filesTask = client.PullRequest.Files(owner, repo, number);
            var statusTask = client.Repository.Status.GetCombined(owner, repo, pr.Head.Sha);

            await Task.WhenAll(reviewsTask, filesTask, statusTask);

            var reviews = reviewsTask.Result
                .Where(r => r.State != PullRequestReviewState.Pending)
                .Select(r => new Core.PullRequests.PullRequestReview
                {
                    ReviewerLogin = r.User?.Login ?? string.Empty,
                    ReviewerAvatarUrl = r.User?.AvatarUrl ?? string.Empty,
                    State = r.State.StringValue,
                    SubmittedAt = r.SubmittedAt
                }).ToList();

            var files = filesTask.Result
                .Select(f => new Core.PullRequests.PullRequestFile
                {
                    FileName = f.FileName,
                    Status = f.Status,
                    Additions = f.Additions,
                    Deletions = f.Deletions,
                    Changes = f.Changes
                }).ToList();

            var combinedStatus = statusTask.Result;
            var ciPassing = combinedStatus.TotalCount > 0 && combinedStatus.State == CommitState.Success;
            var ciHasCombinedStatus = combinedStatus.TotalCount > 0;

            return new PullRequestDetail
            {
                Number = pr.Number,
                Title = pr.Title,
                State = pr.Merged ? "merged" : pr.State.StringValue,
                AuthorLogin = pr.User?.Login ?? string.Empty,
                AuthorAvatarUrl = pr.User?.AvatarUrl ?? string.Empty,
                HeadBranch = pr.Head?.Ref ?? string.Empty,
                BaseBranch = pr.Base?.Ref ?? string.Empty,
                IsDraft = pr.Draft,
                Body = pr.Body ?? string.Empty,
                Labels = pr.Labels?.Select(l => l.Name).ToList() ?? [],
                Reviews = reviews,
                Files = files,
                CiPassing = ciPassing,
                CiHasCombinedStatus = ciHasCombinedStatus,
                HtmlUrl = pr.HtmlUrl,
                CreatedAt = pr.CreatedAt,
                UpdatedAt = pr.UpdatedAt
            };
        }
        catch (AuthorizationException)
        {
            throw new InvalidOperationException("Kein gültiger GitHub-Account verbunden.");
        }
        catch (NotFoundException)
        {
            throw new InvalidOperationException("Pull Request nicht gefunden oder kein Zugriff.");
        }
        catch (RateLimitExceededException)
        {
            throw new InvalidOperationException("GitHub API Rate Limit erreicht. Bitte später erneut versuchen.");
        }
        catch (ApiException ex)
        {
            throw new InvalidOperationException($"GitHub API Fehler: {ex.Message}");
        }
    }

    private GitHubClient CreateClient()
    {
        var token = tokenStore.Load()
            ?? throw new InvalidOperationException("Kein GitHub-Account verbunden. Bitte erst einen PAT-Token hinterlegen.");

        return new GitHubClient(new ProductHeaderValue(GitHubProductHeader))
        {
            Credentials = new Credentials(token)
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
