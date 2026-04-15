using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using Git.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ghGPT.Infrastructure;

internal static class RepositoryServiceExtensions
{
    internal static IServiceCollection AddRepositoryServices(this IServiceCollection services)
    {
        services.AddGitProcess();
        services.AddSingleton<IRepositoryStore, RepositoryStore>();
        services.AddSingleton<RepositoryRegistry>();
        services.AddSingleton<IRepositoryService, RepositoryService>();
        services.AddSingleton<IBranchService, BranchService>();
        services.AddSingleton<IStagingService, StagingService>();
        services.AddSingleton<IStashService, StashService>();
        services.AddSingleton<RepositoryWatcherService>();
        services.AddSingleton<IRepositoryWatcherService>(sp => sp.GetRequiredService<RepositoryWatcherService>());
        services.AddHostedService(sp => sp.GetRequiredService<RepositoryWatcherService>());
        return services;
    }
}
