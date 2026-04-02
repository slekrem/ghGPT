using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using System.Runtime.CompilerServices;
using System.Text;

namespace ghGPT.Infrastructure.Ai;

internal sealed class ChatService(IOllamaClient ollamaClient, IRepositoryService repositoryService) : IChatService
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

    private IEnumerable<ChatMessage> BuildMessages(ChatRequest request)
    {
        yield return new ChatMessage
        {
            Role = "system",
            Content = SystemPrompt.Build(request.RepoId, request.Branch)
        };

        var context = BuildRepositoryContext(request.RepoId);
        if (context is not null)
            yield return new ChatMessage { Role = "system", Content = context };

        yield return new ChatMessage { Role = "user", Content = request.Message };
    }

    private string? BuildRepositoryContext(string? repoId)
    {
        if (string.IsNullOrEmpty(repoId)) return null;

        try
        {
            var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
            if (repo is null) return null;

            var sb = new StringBuilder();
            sb.AppendLine("## Repository-Kontext");
            sb.AppendLine($"- Name: {repo.Name}");
            sb.AppendLine($"- Pfad: {repo.LocalPath}");

            if (!string.IsNullOrEmpty(repo.RemoteUrl))
                sb.AppendLine($"- Remote: {repo.RemoteUrl}");

            var branches = repositoryService.GetBranches(repoId);
            var head = branches.FirstOrDefault(b => b.IsHead && !b.IsRemote);
            if (head is not null)
            {
                sb.Append($"- Aktueller Branch: {head.Name}");
                if (head.TrackingBranch is not null)
                {
                    if (head.AheadBy > 0 || head.BehindBy > 0)
                        sb.Append($" (↑{head.AheadBy} voraus, ↓{head.BehindBy} zurück)");
                    else
                        sb.Append(" (aktuell)");
                }
                sb.AppendLine();
            }

            var commits = repositoryService.GetHistory(repoId, limit: 5);
            if (commits.Count > 0)
            {
                sb.AppendLine("- Letzte Commits:");
                foreach (var c in commits)
                    sb.AppendLine($"  - {c.ShortSha} {c.Message} ({c.AuthorName})");
            }

            var status = repositoryService.GetStatus(repoId);
            var stagedCount = status.Staged.Count;
            var unstagedCount = status.Unstaged.Count;
            if (stagedCount > 0 || unstagedCount > 0)
                sb.AppendLine($"- Änderungen: {stagedCount} staged, {unstagedCount} unstaged");

            return sb.ToString().TrimEnd();
        }
        catch
        {
            return null;
        }
    }
}
