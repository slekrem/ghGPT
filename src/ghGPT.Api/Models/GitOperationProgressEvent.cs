namespace ghGPT.Api.Models;

public class GitOperationProgressEvent
{
    public string RepoId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
