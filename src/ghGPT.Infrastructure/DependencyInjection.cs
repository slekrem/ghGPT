using ghGPT.Core.Account;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Account;
using ghGPT.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;
using System.Runtime.InteropServices;

namespace ghGPT.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            services.AddSingleton<ITokenStore, WindowsTokenStore>();
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            services.AddSingleton<ITokenStore, MacOsTokenStore>();
        else
            throw new PlatformNotSupportedException("Token-Speicherung wird auf dieser Plattform nicht unterstützt.");

        services.AddSingleton<IRepositoryStore, RepositoryStore>();
        services.AddSingleton<IRepositoryService, RepositoryService>();
        services.AddSingleton<IAccountService, AccountService>();
        return services;
    }
}
