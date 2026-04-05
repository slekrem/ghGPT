using ghGPT.Core.PullRequests;
using ghGPT.Infrastructure.PullRequests;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

internal static class PullRequestServiceExtensions
{
    internal static IServiceCollection AddPullRequestServices(this IServiceCollection services)
    {
        services.AddSingleton<IPullRequestService, PullRequestService>();
        return services;
    }
}
