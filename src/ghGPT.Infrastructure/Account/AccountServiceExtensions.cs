using GhCli.Net;
using ghGPT.Core.Account;
using ghGPT.Infrastructure.Account;
using Microsoft.Extensions.DependencyInjection;
using System.Runtime.InteropServices;

namespace ghGPT.Infrastructure;

internal static class AccountServiceExtensions
{
    internal static IServiceCollection AddAccountServices(this IServiceCollection services)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            services.AddSingleton<ITokenStore, WindowsTokenStore>();
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            services.AddSingleton<ITokenStore, MacOsTokenStore>();
        else
            services.AddSingleton<ITokenStore, LinuxTokenStore>();

        services.AddGhCli();
        services.AddSingleton<IAccountService, AccountService>();
        return services;
    }
}
