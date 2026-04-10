namespace ghGPT.Core.Ai;

public class ToolCallResponse
{
    public bool HasToolCalls { get; set; }
    public IReadOnlyList<ToolCall> ToolCalls { get; set; } = [];
    public string? Content { get; set; }
}
