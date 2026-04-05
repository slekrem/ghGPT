using GhCli.Net.Abstractions;
using GhCli.Net.PullRequests.Models;
using System.Text.Json;

namespace GhCli.Net.PullRequests;

internal class PullRequestClient(IGhCliRunner runner) : IPullRequestClient
{
    private static readonly JsonSerializerOptions JsonOptions = new();

    private const string ListFields = "number,title,state,author,headRefName,baseRefName,isDraft,mergeable,labels,createdAt,updatedAt,url";
    private const string DetailFields = "number,title,state,author,headRefName,baseRefName,isDraft,body,labels,reviews,files,statusCheckRollup,url,createdAt,updatedAt";
    private const string ChecksFields = "name,state,conclusion,startedAt,completedAt,link";

    public async Task<IReadOnlyList<PullRequest>> ListAsync(string owner, string repo, string state = "open", int limit = 100)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentException.ThrowIfNullOrWhiteSpace(state);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(limit);

        var json = await runner.RunAsync(
            "pr", "list",
            "--repo", $"{owner}/{repo}",
            "--state", state,
            "--limit", limit.ToString(),
            "--json", ListFields);

        return JsonSerializer.Deserialize<List<PullRequest>>(json, JsonOptions) ?? [];
    }

    public async Task<PullRequestDetail> GetDetailAsync(string owner, string repo, int number)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(number);

        var json = await runner.RunAsync(
            "pr", "view", number.ToString(),
            "--repo", $"{owner}/{repo}",
            "--json", DetailFields);

        return JsonSerializer.Deserialize<PullRequestDetail>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Pull Request #{number} konnte nicht abgerufen werden.");
    }

    public async Task AddCommentAsync(string owner, string repo, int number, string body)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(number);
        ArgumentException.ThrowIfNullOrWhiteSpace(body);

        await runner.RunAsync(
            "pr", "comment", number.ToString(),
            "--repo", $"{owner}/{repo}",
            "--body", body);
    }

    public async Task CreateReviewAsync(string owner, string repo, int number, PullRequestReviewEvent reviewEvent, string? body = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(number);

        var eventFlag = reviewEvent switch
        {
            PullRequestReviewEvent.Approve => "--approve",
            PullRequestReviewEvent.RequestChanges => "--request-changes",
            PullRequestReviewEvent.Comment => "--comment",
            _ => throw new ArgumentOutOfRangeException(nameof(reviewEvent))
        };

        var args = new List<string>
        {
            "pr", "review", number.ToString(),
            "--repo", $"{owner}/{repo}",
            eventFlag
        };

        if (!string.IsNullOrWhiteSpace(body))
            args.AddRange(["--body", body]);

        await runner.RunAsync([.. args]);
    }

    public async Task<IReadOnlyList<PullRequestStatusCheck>> GetChecksAsync(string owner, string repo, int number)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(number);

        var json = await runner.RunAsync(
            "pr", "checks", number.ToString(),
            "--repo", $"{owner}/{repo}",
            "--json", ChecksFields);

        return JsonSerializer.Deserialize<List<PullRequestStatusCheck>>(json, JsonOptions) ?? [];
    }
}
