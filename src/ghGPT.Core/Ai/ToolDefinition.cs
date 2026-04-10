namespace ghGPT.Core.Ai;

public class ToolDefinition
{
    public string Type { get; set; } = "function";
    public ToolFunction Function { get; set; } = null!;
}
