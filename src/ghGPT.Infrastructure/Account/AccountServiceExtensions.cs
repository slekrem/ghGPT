using GhCli.Net;
using ghGPT.Core.Account;
using ghGPT.Infrastructure.Account;
using Microsoft.Extensions.DependencyInjection;

namespace ghGPT.Infrastructure;

internal static class AccountServiceExtensions
{
    internal static IServiceCollection AddAccountServices(this IServiceCollection services)
    {
        services.AddGhCli();
        services.AddSingleton<IAccountService, AccountService>();
        return services;
    }
}
