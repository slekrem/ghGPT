using ghGPT.Core.Account;
using ghGPT.Core.Ai;
using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Account;
using ghGPT.Infrastructure.Ai;
using ghGPT.Infrastructure.PullRequests;
using ghGPT.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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
            services.AddSingleton<ITokenStore, LinuxTokenStore>();

        services.AddSingleton<IAiSettingsService, AiSettingsService>();
        services.AddSingleton<IOllamaClient, OllamaClient>();
        services.AddSingleton<IChatService, ChatService>();

        services.AddSingleton<IRepositoryStore, RepositoryStore>();
        services.AddSingleton<IRepositoryService, RepositoryService>();
        services.AddSingleton<IAccountService, AccountService>();
        services.AddSingleton<IPullRequestService, PullRequestService>();
        services.AddSingleton<RepositoryWatcherService>();
        services.AddSingleton<IRepositoryWatcherService>(sp => sp.GetRequiredService<RepositoryWatcherService>());
        services.AddHostedService(sp => sp.GetRequiredService<RepositoryWatcherService>());
        return services;
    }
}
