using ghGPT.Ai.Abstractions;

namespace ghGPT.Ai.Tools;

public interface IToolDispatcher
{
    Task<(string Result, string DisplayArgs, bool Success)> DispatchAsync(
        ToolCall toolCall,
        string repoId,
        CancellationToken cancellationToken = default);
}
