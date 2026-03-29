using System.Collections.Concurrent;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryWatcherService(
    IRepositoryStore store,
    IRepositoryEventNotifier notifier,
    ILogger<RepositoryWatcherService> logger) : BackgroundService
{
    private readonly List<FileSystemWatcher> _watchers = [];
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _debounce = new();

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var repos = store.Load();
        foreach (var repo in repos)
        {
            StartWatcher(repo);
        }

        stoppingToken.Register(StopWatchers);
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

        var watcher = new FileSystemWatcher(gitPath)
        {
            IncludeSubdirectories = true,
            EnableRaisingEvents = true,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName
        };

        watcher.Changed += (_, e) => ScheduleNotification(repo.Id, e.FullPath);
        watcher.Created += (_, e) => ScheduleNotification(repo.Id, e.FullPath);
        watcher.Deleted += (_, e) => ScheduleNotification(repo.Id, e.FullPath);
        watcher.Renamed += (_, e) => ScheduleNotification(repo.Id, e.FullPath);

        _watchers.Add(watcher);
        logger.LogInformation("FileSystemWatcher gestartet für Repo {RepoId}", repo.Id);
    }

    private void ScheduleNotification(string repoId, string changedPath)
    {
        if (_debounce.TryGetValue(repoId, out var existing))
        {
            existing.Cancel();
            existing.Dispose();
        }

        var cts = new CancellationTokenSource();
        _debounce[repoId] = cts;
        var token = cts.Token; // vor möglicher Disposal durch nächsten Call abgreifen

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(300, token);

                var isBranchChange = changedPath.Contains("HEAD")
                    || changedPath.Contains(Path.DirectorySeparatorChar + "refs" + Path.DirectorySeparatorChar);

                if (isBranchChange)
                    await notifier.NotifyBranchChangedAsync(repoId);
                else
                    await notifier.NotifyStatusChangedAsync(repoId);
            }
            catch (OperationCanceledException)
            {
                // Durch neues Event abgelöst, ignorieren
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Fehler beim Senden des Repository-Events für {RepoId}", repoId);
            }
        }, CancellationToken.None);
    }

    private void StopWatchers()
    {
        foreach (var watcher in _watchers)
        {
            watcher.EnableRaisingEvents = false;
            watcher.Dispose();
        }
        _watchers.Clear();

        foreach (var cts in _debounce.Values)
        {
            cts.Cancel();
            cts.Dispose();
        }
        _debounce.Clear();
    }

    public override void Dispose()
    {
        StopWatchers();
        base.Dispose();
    }
}
