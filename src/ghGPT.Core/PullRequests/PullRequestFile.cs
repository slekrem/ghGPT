namespace ghGPT.Core.PullRequests;

public class PullRequestFile
{
    public string FileName { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int Additions { get; init; }
    public int Deletions { get; init; }
    public int Changes { get; init; }
}
