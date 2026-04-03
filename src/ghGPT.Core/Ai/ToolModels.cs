namespace ghGPT.Core.Ai;

public class ToolDefinition
{
    public string Type { get; set; } = "function";
    public ToolFunction Function { get; set; } = null!;
}

public class ToolFunction
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public object Parameters { get; set; } = new { };
}

public class ToolCall
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ArgumentsJson { get; set; } = string.Empty;
}

public class ToolCallResponse
{
    public bool HasToolCalls { get; set; }
    public IReadOnlyList<ToolCall> ToolCalls { get; set; } = [];
    public string? Content { get; set; }
}
