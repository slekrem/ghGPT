namespace ghGPT.Core.Ai;

public class ChatMessage
{
    public string Role { get; set; } = string.Empty;
    public string? Content { get; set; }
    public List<ToolCall>? ToolCalls { get; set; }
    public string? ToolCallId { get; set; }
}

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string? RepoId { get; set; }
    public string? Branch { get; set; }
    public string? ActiveView { get; set; }
}

public static class ChatViews
{
    public const string Changes = "changes";
    public const string History = "history";
    public const string Branches = "branches";
    public const string PullRequests = "pull-requests";
}
