using ghGPT.Core.Ai;
using System.Runtime.CompilerServices;

namespace ghGPT.Infrastructure.Ai;

internal sealed class ChatService(IOllamaClient ollamaClient) : IChatService
{
    public async IAsyncEnumerable<string> StreamAsync(
        ChatRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messages = BuildMessages(request);

        await foreach (var token in ollamaClient.GenerateAsync(messages, cancellationToken))
        {
            yield return token;
        }
    }

    private static IEnumerable<ChatMessage> BuildMessages(ChatRequest request)
    {
        var systemContent = new System.Text.StringBuilder();
        systemContent.AppendLine("Du bist ein hilfreicher Git-Assistent in der App ghGPT.");

        if (!string.IsNullOrEmpty(request.RepoId))
            systemContent.AppendLine($"Aktives Repository: {request.RepoId}");

        if (!string.IsNullOrEmpty(request.Branch))
            systemContent.AppendLine($"Aktiver Branch: {request.Branch}");

        yield return new ChatMessage { Role = "system", Content = systemContent.ToString().TrimEnd() };
        yield return new ChatMessage { Role = "user", Content = request.Message };
    }
}
