using ghGPT.Core.Ai;
using ghGPT.Infrastructure.Ai;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

internal static class AiServiceExtensions
{
    internal static IServiceCollection AddAiServices(this IServiceCollection services)
    {
        services.AddSingleton<IToolDispatcher, ToolDispatcher>();
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
