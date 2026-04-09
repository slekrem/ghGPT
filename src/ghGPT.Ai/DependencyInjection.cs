using ghGPT.Ai.Ollama;
using ghGPT.Ai.Tools;
using ghGPT.Core.Ai;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Ai;

public static class DependencyInjection
{
    public static IServiceCollection AddAiServices(this IServiceCollection services)
    {
        services.AddOllamaClient();
        services.AddAiTools();

        services.AddSingleton<DiffService>();
        services.AddSingleton<IAiSettingsService, AiSettingsService>();
        services.AddSingleton<IChatHistoryService, ChatHistoryService>();
        services.AddSingleton<IChatContextBuilder, ChatContextBuilder>();
        services.AddSingleton<IChatService, ChatService>();
        services.AddSingleton<ICommitMessageService, CommitMessageService>();
        services.AddSingleton<ICodeReviewService, CodeReviewService>();
        services.AddSingleton<ICommitSummaryService, CommitSummaryService>();
        return services;
    }
}
