using GhCli.Net.Abstractions;
using ghGPT.Core.Issues;

namespace ghGPT.Infrastructure.Issues;

public class IssueService(IIssueClient issueClient) : IIssueService
{
    public async Task<IReadOnlyList<IssueListItem>> GetIssuesAsync(string owner, string repo, string state = "open")
    {
        var issues = await issueClient.ListAsync(owner, repo, state);
        return issues.Select(i => new IssueListItem
        {
            Number = i.Number,
            Title = i.Title,
            State = i.State,
            AuthorLogin = i.Author.Login,
            Labels = i.Labels.Select(l => new IssueLabel { Name = l.Name, Color = l.Color }).ToList(),
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
            Url = i.Url
        }).ToList();
    }

    public async Task<IssueDetail> GetIssueDetailAsync(string owner, string repo, int number)
    {
        var i = await issueClient.GetDetailAsync(owner, repo, number);
        return new IssueDetail
        {
            Number = i.Number,
            Title = i.Title,
            State = i.State,
            AuthorLogin = i.Author.Login,
            Labels = i.Labels.Select(l => new IssueLabel { Name = l.Name, Color = l.Color }).ToList(),
            Assignees = i.Assignees.Select(a => a.Login).ToList(),
            Body = i.Body,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
            Url = i.Url
        };
    }

    public async Task<IssueDetail?> GetLinkedIssueForBranchAsync(string owner, string repo, string branchName)
    {
        var i = await issueClient.GetLinkedIssueForBranchAsync(owner, repo, branchName);
        if (i is null) return null;
        return new IssueDetail
        {
            Number = i.Number,
            Title = i.Title,
            State = i.State,
            AuthorLogin = i.Author.Login,
            Labels = i.Labels.Select(l => new IssueLabel { Name = l.Name, Color = l.Color }).ToList(),
            Assignees = i.Assignees.Select(a => a.Login).ToList(),
            Body = i.Body,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
            Url = i.Url
        };
    }

    public async Task<IssueListItem> CreateAsync(string owner, string repo, string title, string body, IEnumerable<string>? labels = null)
    {
        var i = await issueClient.CreateAsync(owner, repo, title, body, labels);
        return new IssueListItem
        {
            Number = i.Number,
            Title = i.Title,
            State = i.State,
            AuthorLogin = i.Author.Login,
            Labels = i.Labels.Select(l => new IssueLabel { Name = l.Name, Color = l.Color }).ToList(),
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
            Url = i.Url
        };
    }

    public Task AddCommentAsync(string owner, string repo, int number, string body) =>
        issueClient.AddCommentAsync(owner, repo, number, body);
}
