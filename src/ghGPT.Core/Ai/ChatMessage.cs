namespace ghGPT.Core.Ai;

public class ChatMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string? RepoId { get; set; }
    public string? Branch { get; set; }
}
