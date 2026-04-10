using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddAccountServices();
        services.AddRepositoryServices();
        services.AddPullRequestServices();
        services.AddIssueServices();
        services.AddReleaseServices();
        services.AddDiscussionServices();
        return services;
    }
}
