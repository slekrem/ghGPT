namespace ghGPT.Ai.Abstractions;

public record ToolExecutedEvent(
    string ToolName,
    string DisplayArgs,
    bool Success,
    string Message) : ChatEvent;
