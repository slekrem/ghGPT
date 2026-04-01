namespace ghGPT.Core.Repositories;

public interface IRepositoryWatcherService
{
    void StartWatcher(RepositoryInfo repo);
    void StopWatcher(string id);
}
