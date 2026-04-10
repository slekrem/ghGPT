namespace ghGPT.Core.Ai;

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string? RepoId { get; set; }
    public string? Branch { get; set; }
    public string? ActiveView { get; set; }
}
