using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.SignalR;

namespace ghGPT.Api.Hubs;

public class RepositoryEventNotifier(IHubContext<RepositoryHub> hub) : IRepositoryEventNotifier
{
    public Task NotifyStatusChangedAsync(string repoId) =>
        hub.Clients.All.SendAsync("status-changed", new { repoId });

    public Task NotifyBranchChangedAsync(string repoId) =>
        hub.Clients.All.SendAsync("branch-changed", new { repoId });
}
