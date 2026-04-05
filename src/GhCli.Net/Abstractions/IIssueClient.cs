using GhCli.Net.Issues.Models;

namespace GhCli.Net.Abstractions;

public interface IIssueClient
{
    Task<IReadOnlyList<Issue>> ListAsync(string owner, string repo, string state = "open", int limit = 30);
    Task<IssueDetail> GetDetailAsync(string owner, string repo, int number);
    Task<Issue> CreateAsync(string owner, string repo, string title, string body, IEnumerable<string>? labels = null);
    Task AddCommentAsync(string owner, string repo, int number, string body);
}
