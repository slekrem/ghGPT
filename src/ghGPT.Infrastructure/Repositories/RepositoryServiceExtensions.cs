using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ghGPT.Infrastructure;

internal static class RepositoryServiceExtensions
{
    internal static IServiceCollection AddRepositoryServices(this IServiceCollection services)
    {
        services.AddSingleton<IRepositoryStore, RepositoryStore>();
        services.AddSingleton<IRepositoryService, RepositoryService>();
        services.AddSingleton<RepositoryWatcherService>();
        services.AddSingleton<IRepositoryWatcherService>(sp => sp.GetRequiredService<RepositoryWatcherService>());
        services.AddHostedService(sp => sp.GetRequiredService<RepositoryWatcherService>());
        return services;
    }
}
