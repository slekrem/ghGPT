namespace ghGPT.Api.Models;

public class CommitRequest
{
    public string Message { get; init; } = string.Empty;
    public string? Description { get; init; }
}
