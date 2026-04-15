using Git.Process.Abstractions;
using Git.Process.Branch;
using Git.Process.Repository;
using Git.Process.Staging;
using Git.Process.Stash;
using Microsoft.Extensions.DependencyInjection;

namespace Git.Process;

public class GitClient
{
    public IGitRepositoryClient Repository { get; }
    public IGitStagingClient Staging { get; }
    public IGitBranchClient Branch { get; }
    public IGitStashClient Stash { get; }

    public GitClient() : this(new GitRunner()) { }

    internal GitClient(IGitRunner runner)
    {
        Repository = new GitRepositoryClient(runner);
        Staging = new GitStagingClient(runner);
        Branch = new GitBranchClient(runner);
        Stash = new GitStashClient(runner);
    }
}

public static class GitClientServiceCollectionExtensions
{
    public static IServiceCollection AddGitProcess(this IServiceCollection services)
    {
        services.AddSingleton<IGitRunner, GitRunner>();
        services.AddSingleton<IGitRepositoryClient, GitRepositoryClient>();
        services.AddSingleton<IGitStagingClient, GitStagingClient>();
        services.AddSingleton<IGitBranchClient, GitBranchClient>();
        services.AddSingleton<IGitStashClient, GitStashClient>();
        services.AddSingleton<GitClient>();
        return services;
    }
}
