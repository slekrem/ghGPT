using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IRepositoryStore, RepositoryStore>();
        services.AddSingleton<IRepositoryService, RepositoryService>();
        return services;
    }
}
