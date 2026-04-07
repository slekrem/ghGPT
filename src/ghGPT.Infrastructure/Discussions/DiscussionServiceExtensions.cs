using ghGPT.Core.Discussions;
using ghGPT.Infrastructure.Discussions;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

internal static class DiscussionServiceExtensions
{
    internal static IServiceCollection AddDiscussionServices(this IServiceCollection services)
    {
        services.AddSingleton<IDiscussionService, DiscussionService>();
        return services;
    }
}
