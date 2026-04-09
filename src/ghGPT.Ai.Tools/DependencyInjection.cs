using ghGPT.Core.Ai;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Ai.Tools;

public static class DependencyInjection
{
    public static IServiceCollection AddAiTools(this IServiceCollection services)
    {
        services.AddSingleton<IToolDispatcher, ToolDispatcher>();
        return services;
    }
}
