using Git.Process.Abstractions;
using Microsoft.Extensions.DependencyInjection;

namespace Git.Process;

public class GitClient
{
    internal GitClient(IGitRunner runner) { }
}

public static class GitClientServiceCollectionExtensions
{
    public static IServiceCollection AddGitProcess(this IServiceCollection services)
    {
        services.AddSingleton<IGitRunner, GitRunner>();
        services.AddSingleton<GitClient>();
        return services;
    }
}
