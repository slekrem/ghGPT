using ghGPT.Ai.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Ai.Ollama;

public static class DependencyInjection
{
    public static IServiceCollection AddOllamaClient(this IServiceCollection services)
    {
        services.AddHttpClient("Ollama", client =>
        {
            client.Timeout = TimeSpan.FromMinutes(10);
        });
        services.AddSingleton<IOllamaClient, OllamaClient>();
        services.AddSingleton<IAiProviderService, OllamaProviderService>();
        return services;
    }
}
