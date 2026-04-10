namespace ghGPT.Core.Ai;

public record ToolExecutedEvent(
    string ToolName,
    string DisplayArgs,
    bool Success,
    string Message) : ChatEvent;
