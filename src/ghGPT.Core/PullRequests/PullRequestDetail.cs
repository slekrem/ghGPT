namespace ghGPT.Core.PullRequests;

public class PullRequestDetail
{
    public int Number { get; init; }
    public string Title { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public string AuthorLogin { get; init; } = string.Empty;
    public string AuthorAvatarUrl { get; init; } = string.Empty;
    public string HeadBranch { get; init; } = string.Empty;
    public string BaseBranch { get; init; } = string.Empty;
    public bool IsDraft { get; init; }
    public string Body { get; init; } = string.Empty;
    public IReadOnlyList<string> Labels { get; init; } = [];
    public IReadOnlyList<PullRequestReview> Reviews { get; init; } = [];
    public IReadOnlyList<PullRequestFile> Files { get; init; } = [];
    public bool CiPassing { get; init; }
    public bool CiHasCombinedStatus { get; init; }
    public string HtmlUrl { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
