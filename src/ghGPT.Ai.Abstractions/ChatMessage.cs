namespace ghGPT.Ai.Abstractions;

public class ChatMessage
{
    public string Role { get; set; } = string.Empty;
    public string? Content { get; set; }
    public List<ToolCall>? ToolCalls { get; set; }
    public string? ToolCallId { get; set; }
}
