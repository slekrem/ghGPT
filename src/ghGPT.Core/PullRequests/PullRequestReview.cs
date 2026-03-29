namespace ghGPT.Core.PullRequests;

public class PullRequestReview
{
    public string ReviewerLogin { get; init; } = string.Empty;
    public string ReviewerAvatarUrl { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public DateTimeOffset SubmittedAt { get; init; }
}
