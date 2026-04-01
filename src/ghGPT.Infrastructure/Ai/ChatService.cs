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
        yield return new ChatMessage
        {
            Role = "system",
            Content = SystemPrompt.Build(request.RepoId, request.Branch)
        };
        yield return new ChatMessage { Role = "user", Content = request.Message };
    }
}
