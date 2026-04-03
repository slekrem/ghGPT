using GhCli.Net.Abstractions;
using GhCli.Net.Discussions;
using Microsoft.Extensions.DependencyInjection;

namespace GhCli.Net;

public class GhClient
{
    public IDiscussionClient Discussion { get; }

    public GhClient() : this(new GhCliRunner()) { }

    internal GhClient(IGhCliRunner runner)
    {
        Discussion = new DiscussionClient(runner);
    }
}

public static class GhClientServiceCollectionExtensions
{
    public static IServiceCollection AddGhCli(this IServiceCollection services)
    {
        services.AddSingleton<IGhCliRunner, GhCliRunner>();
        services.AddSingleton<IDiscussionClient, DiscussionClient>();
        services.AddSingleton<GhClient>();
        return services;
    }
}
