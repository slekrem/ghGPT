namespace ghGPT.Core.Issues;

public interface IIssueService
{
    Task<IReadOnlyList<IssueListItem>> GetIssuesAsync(string owner, string repo, string state = "open");
    Task<IssueDetail> GetIssueDetailAsync(string owner, string repo, int number);
    Task<IssueListItem> CreateAsync(string owner, string repo, string title, string body, IEnumerable<string>? labels = null);
    Task AddCommentAsync(string owner, string repo, int number, string body);
}
