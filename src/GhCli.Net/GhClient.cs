using GhCli.Net.Abstractions;
using GhCli.Net.Discussions;
using GhCli.Net.Issues;
using GhCli.Net.PullRequests;
using GhCli.Net.Releases;
using GhCli.Net.User;
using Microsoft.Extensions.DependencyInjection;

namespace GhCli.Net;

public class GhClient
{
    public IDiscussionClient Discussion { get; }
    public IIssueClient Issue { get; }
    public IPullRequestClient PullRequest { get; }
    public IReleaseClient Release { get; }
    public IUserClient User { get; }

    public GhClient() : this(new GhCliRunner()) { }

    internal GhClient(IGhCliRunner runner)
    {
        Discussion = new DiscussionClient(runner);
        Issue = new IssueClient(runner);
        PullRequest = new PullRequestClient(runner);
        Release = new ReleaseClient(runner);
        User = new UserClient(runner);
    }
}

public static class GhClientServiceCollectionExtensions
{
    public static IServiceCollection AddGhCli(this IServiceCollection services)
    {
        services.AddSingleton<IGhCliRunner, GhCliRunner>();
        services.AddSingleton<IDiscussionClient, DiscussionClient>();
        services.AddSingleton<IIssueClient, IssueClient>();
        services.AddSingleton<IPullRequestClient, PullRequestClient>();
        services.AddSingleton<IReleaseClient, ReleaseClient>();
        services.AddSingleton<IUserClient, UserClient>();
        services.AddSingleton<GhClient>();
        return services;
    }
}
