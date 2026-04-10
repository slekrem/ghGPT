using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Ai.Ollama;

public static class DependencyInjection
{
    public static IServiceCollection AddOllamaClient(this IServiceCollection services)
    {
        services.AddSingleton<IOllamaClient, OllamaClient>();
        return services;
    }
}
