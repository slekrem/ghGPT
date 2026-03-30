namespace ghGPT.Core.Repositories;

public interface IRepositoryEventNotifier
{
    Task NotifyStatusChangedAsync(string repoId);
    Task NotifyBranchChangedAsync(string repoId);
}
