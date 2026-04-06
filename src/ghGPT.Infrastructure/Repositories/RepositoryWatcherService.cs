using System.Collections.Concurrent;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryWatcherService(
    IRepositoryStore store,
    IRepositoryService repositoryService,
    IRepositoryEventNotifier notifier,
    ILogger<RepositoryWatcherService> logger) : BackgroundService, IRepositoryWatcherService
{
    private readonly ConcurrentDictionary<string, List<FileSystemWatcher>> _watchers = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _debounce = new();
    private readonly object _debounceLock = new();

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var repos = store.Load();
        foreach (var repo in repos)
        {
            repositoryService.RefreshCurrentBranch(repo.Id);
            StartWatcher(repo);
        }

        stoppingToken.Register(StopAllWatchers);
        return Task.CompletedTask;
    }

    public void StartWatcher(RepositoryInfo repo)
    {
        var gitPath = Path.Combine(repo.LocalPath, ".git");
        if (!Directory.Exists(gitPath))
        {
            logger.LogWarning("Kein .git-Verzeichnis gefunden für Repo {RepoId} unter {Path}", repo.Id, gitPath);
            return;
        }

        // Watcher 1: .git/ – erkennt Branch- und Index-Änderungen
        var gitWatcher = new FileSystemWatcher(gitPath)
        {
            IncludeSubdirectories = true,
            EnableRaisingEvents = true,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName
        };

        gitWatcher.Changed += (_, e) => ScheduleNotification(repo.Id, e.FullPath);
        gitWatcher.Created += (_, e) => ScheduleNotification(repo.Id, e.FullPath);
        gitWatcher.Deleted += (_, e) => ScheduleNotification(repo.Id, e.FullPath);
        gitWatcher.Renamed += (_, e) => ScheduleNotification(repo.Id, e.FullPath);

        // Watcher 2: Repo-Root – erkennt Änderungen im Working Tree (ungestagete Dateien)
        var workingTreeWatcher = new FileSystemWatcher(repo.LocalPath)
        {
            IncludeSubdirectories = true,
            EnableRaisingEvents = true,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName
        };

        workingTreeWatcher.Changed += (_, e) => OnWorkingTreeChanged(repo.Id, e.FullPath, gitPath);
        workingTreeWatcher.Created += (_, e) => OnWorkingTreeChanged(repo.Id, e.FullPath, gitPath);
        workingTreeWatcher.Deleted += (_, e) => OnWorkingTreeChanged(repo.Id, e.FullPath, gitPath);
        workingTreeWatcher.Renamed += (_, e) => OnWorkingTreeChanged(repo.Id, e.FullPath, gitPath);

        _watchers[repo.Id] = [gitWatcher, workingTreeWatcher];
        logger.LogInformation("FileSystemWatcher gestartet für Repo {RepoId}", repo.Id);
    }

    public void StopWatcher(string id)
    {
        if (!_watchers.TryRemove(id, out var watchers))
            return;

        foreach (var watcher in watchers)
        {
            watcher.EnableRaisingEvents = false;
            watcher.Dispose();
        }

        lock (_debounceLock)
        {
            foreach (var suffix in new[] { ":branch", ":status" })
            {
                if (_debounce.TryRemove(id + suffix, out var cts))
                {
                    cts.Cancel();
                    cts.Dispose();
                }
            }
        }

        logger.LogInformation("FileSystemWatcher gestoppt für Repo {RepoId}", id);
    }

    private void OnWorkingTreeChanged(string repoId, string changedPath, string gitPath)
    {
        // .git/-Events werden vom gitWatcher behandelt, hier ignorieren
        if (changedPath.StartsWith(gitPath, StringComparison.OrdinalIgnoreCase))
            return;

        // Interne Review-Hilfsdateien ignorieren – sie werden von ghGPT selbst geschrieben
        // und sollen keinen Status-Reset im UI auslösen
        var fileName = Path.GetFileName(changedPath);
        if (fileName.StartsWith(".review-", StringComparison.OrdinalIgnoreCase))
            return;

        ScheduleStatusNotification(repoId);
    }

    private void ScheduleNotification(string repoId, string changedPath)
    {
        var isBranchChange = changedPath.Contains("HEAD")
            || changedPath.Contains(Path.DirectorySeparatorChar + "refs" + Path.DirectorySeparatorChar);

        if (isBranchChange)
            ScheduleDebounced(repoId + ":branch", async () =>
            {
                repositoryService.RefreshCurrentBranch(repoId);
                await notifier.NotifyBranchChangedAsync(repoId);
            });
        else
            ScheduleStatusNotification(repoId);
    }

    private void ScheduleStatusNotification(string repoId)
    {
        ScheduleDebounced(repoId + ":status", () => notifier.NotifyStatusChangedAsync(repoId));
    }

    internal void ScheduleDebounced(string repoId, Func<Task> action)
    {
        CancellationToken token;
        lock (_debounceLock)
        {
            if (_debounce.TryGetValue(repoId, out var existing))
            {
                existing.Cancel();
                existing.Dispose();
            }

            var cts = new CancellationTokenSource();
            _debounce[repoId] = cts;
            token = cts.Token;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(300);
                if (token.IsCancellationRequested)
                {
                    logger.LogDebug("Debounce für {RepoId} durch neues Event abgelöst", repoId);
                    return;
                }
                await action();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Fehler beim Senden des Repository-Events für {RepoId}", repoId);
            }
        }, CancellationToken.None);
    }

    private void StopAllWatchers()
    {
        foreach (var watchers in _watchers.Values)
        {
            foreach (var watcher in watchers)
            {
                watcher.EnableRaisingEvents = false;
                watcher.Dispose();
            }
        }
        _watchers.Clear();

        lock (_debounceLock)
        {
            foreach (var cts in _debounce.Values)
            {
                cts.Cancel();
                cts.Dispose();
            }
            _debounce.Clear();
        }
    }

    public override void Dispose()
    {
        StopAllWatchers();
        base.Dispose();
    }
}
