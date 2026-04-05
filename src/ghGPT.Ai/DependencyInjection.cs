using ghGPT.Core.Ai;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Ai;

public static class DependencyInjection
{
    public static IServiceCollection AddAiServices(this IServiceCollection services)
    {
        services.AddSingleton<IToolDispatcher, ToolDispatcher>();
        services.AddSingleton<IChatContextBuilder, ChatContextBuilder>();
        services.AddSingleton<IAiSettingsService, AiSettingsService>();
        services.AddSingleton<IOllamaClient, OllamaClient>();
        services.AddSingleton<IChatHistoryService, ChatHistoryService>();
        services.AddSingleton<IChatService, ChatService>();
        services.AddSingleton<ICommitMessageService, CommitMessageService>();
        services.AddSingleton<ICodeReviewService, CodeReviewService>();
        services.AddSingleton<ICommitSummaryService, CommitSummaryService>();
        return services;
    }
}
