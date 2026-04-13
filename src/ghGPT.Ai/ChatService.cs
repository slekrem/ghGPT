using ghGPT.Ai.Abstractions;
using ghGPT.Ai.Ollama;
using ghGPT.Ai.Tools;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Ai;

internal sealed class ChatService(
    IOllamaClient ollamaClient,
    IChatHistoryService historyService,
    IToolDispatcher toolDispatcher,
    IChatContextBuilder contextBuilder) : IChatService
{
    private const int MaxToolRounds = 5;

    public async IAsyncEnumerable<ChatEvent> StreamAsync(
        ChatRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messages = await contextBuilder.BuildAsync(request);

        if (!string.IsNullOrEmpty(request.RepoId))
            historyService.Append(request.RepoId, "user", request.Message);

        // Tool-Loop: nur wenn ein Repo aktiv ist
        if (!string.IsNullOrEmpty(request.RepoId))
        {
            var messageList = messages.ToList();
            var tools = ToolDefinitions.All;
            string? toolLoopAnswer = null;

            for (var round = 0; round < MaxToolRounds; round++)
            {
                var toolResponse = await ollamaClient.CompleteWithToolsAsync(messageList, tools, cancellationToken);

                if (!toolResponse.HasToolCalls)
                {
                    toolLoopAnswer = toolResponse.Content ?? string.Empty;
                    break;
                }

                messageList.Add(new ChatMessage
                {
                    Role = "assistant",
                    ToolCalls = toolResponse.ToolCalls.ToList()
                });

                foreach (var toolCall in toolResponse.ToolCalls)
                {
                    var (result, displayArgs, success) = await toolDispatcher.DispatchAsync(toolCall, request.RepoId, cancellationToken);

                    yield return new ToolExecutedEvent(
                        ToolName: toolCall.Name,
                        DisplayArgs: displayArgs,
                        Success: success,
                        Message: success ? GetSuccessMessage(toolCall.Name, displayArgs) : result);

                    messageList.Add(new ChatMessage
                    {
                        Role = "tool",
                        ToolCallId = toolCall.Id,
                        Content = result
                    });
                }
            }

            if (toolLoopAnswer is not null)
            {
                if (toolLoopAnswer.Length > 0)
                {
                    yield return new TokenEvent(toolLoopAnswer);
                    historyService.Append(request.RepoId, "assistant", toolLoopAnswer);
                }
                yield break;
            }

            messages = messageList;
        }

        var assistantResponse = new StringBuilder();
        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
        {
            assistantResponse.Append(token);
            yield return new TokenEvent(token);
        }

        if (!string.IsNullOrEmpty(request.RepoId) && assistantResponse.Length > 0)
            historyService.Append(request.RepoId, "assistant", assistantResponse.ToString());
    }

    private static string GetSuccessMessage(string toolName, string displayArgs) => toolName switch
    {
        ToolNames.GetStatus => "Repository-Status abgerufen",
        ToolNames.GetBranches => "Branches abgerufen",
        ToolNames.CheckoutBranch => $"Branch gewechselt: {displayArgs.Replace($"{ToolNames.CheckoutBranch}(", "").TrimEnd(')')}",
        ToolNames.CreateBranch => $"Branch erstellt: {displayArgs.Replace($"{ToolNames.CreateBranch}(", "").TrimEnd(')')}",
        ToolNames.GetHistory => "Commit-History abgerufen",
        ToolNames.Fetch => "Remote-Stand aktualisiert (fetch)",
        _ => displayArgs
    };
}
