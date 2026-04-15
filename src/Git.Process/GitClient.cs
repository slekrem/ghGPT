using Git.Process.Abstractions;
using Git.Process.Repository;
using Microsoft.Extensions.DependencyInjection;

namespace Git.Process;

public class GitClient
{
    public IGitRepositoryClient Repository { get; }

    public GitClient() : this(new GitRunner()) { }

    internal GitClient(IGitRunner runner)
    {
        Repository = new GitRepositoryClient(runner);
    }
}

public static class GitClientServiceCollectionExtensions
{
    public static IServiceCollection AddGitProcess(this IServiceCollection services)
    {
        services.AddSingleton<IGitRunner, GitRunner>();
        services.AddSingleton<IGitRepositoryClient, GitRepositoryClient>();
        services.AddSingleton<GitClient>();
        return services;
    }
}
