using ghGPT.Core.Releases;
using ghGPT.Infrastructure.Releases;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

internal static class ReleaseServiceExtensions
{
    internal static IServiceCollection AddReleaseServices(this IServiceCollection services)
    {
        services.AddSingleton<IReleaseService, ReleaseService>();
        return services;
    }
}
