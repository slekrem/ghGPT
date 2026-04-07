using ghGPT.Core.Issues;
using ghGPT.Infrastructure.Issues;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

internal static class IssueServiceExtensions
{
    internal static IServiceCollection AddIssueServices(this IServiceCollection services)
    {
        services.AddSingleton<IIssueService, IssueService>();
        return services;
    }
}
