using ghGPT.Core.Ai;
using System.Runtime.CompilerServices;

namespace ghGPT.Infrastructure.Ai;

internal sealed class ChatService(IOllamaClient ollamaClient) : IChatService
{
    public async IAsyncEnumerable<string> StreamAsync(
        ChatRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var prompt = BuildPrompt(request);

        await foreach (var token in ollamaClient.GenerateAsync(prompt, cancellationToken))
        {
            yield return token;
        }
    }

    private static string BuildPrompt(ChatRequest request)
    {
        var context = new System.Text.StringBuilder();

        context.AppendLine("Du bist ein hilfreicher Git-Assistent in der App ghGPT.");

        if (!string.IsNullOrEmpty(request.RepoId))
        {
            context.Append("Aktives Repository: ");
            context.AppendLine(request.RepoId);
        }

        if (!string.IsNullOrEmpty(request.Branch))
        {
            context.Append("Aktiver Branch: ");
            context.AppendLine(request.Branch);
        }

        context.AppendLine();
        context.AppendLine("Benutzer:");
        context.Append(request.Message);

        return context.ToString();
    }
}
