namespace ghGPT.Core.Ai;

public abstract record ChatEvent;

public record TokenEvent(string Token) : ChatEvent;

public record ToolExecutedEvent(
    string ToolName,
    string DisplayArgs,
    bool Success,
    string Message) : ChatEvent;
