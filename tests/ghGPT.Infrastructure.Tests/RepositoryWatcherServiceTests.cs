using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ghGPT.Infrastructure.Tests;

public class RepositoryWatcherServiceTests : IDisposable
{
    private readonly string _tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    private string CreateGitRepo(string name = "repo")
    {
        var path = Path.Combine(_tempPath, name);
        Directory.CreateDirectory(path);
        Run("git init -b main", path);
        Run("git config user.email test@test.com", path);
        Run("git config user.name Test", path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Hello\n");
        Run("git add .", path);
        Run("git commit -m initial", path);
        return path;
    }

    private static void Run(string cmd, string cwd)
    {
        var parts = cmd.Split(' ', 2);
        var psi = new System.Diagnostics.ProcessStartInfo(parts[0], parts.Length > 1 ? parts[1] : "")
        {
            WorkingDirectory = cwd,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        using var p = System.Diagnostics.Process.Start(psi)!;
        p.WaitForExit();
    }

    [Fact]
    public async Task OnStartup_RefreshesCurrentBranchForAllRepos()
    {
        var path = CreateGitRepo("startup-repo");
        Run("git checkout -b feature", path);

        var repoId = "startup-id";
        var info = new RepositoryInfo { Id = repoId, Name = "repo", LocalPath = path, CurrentBranch = "master" };

        var store = Substitute.For<IRepositoryStore>();
        store.Load().Returns([info]);

        var repositoryService = Substitute.For<IRepositoryService>();
        var notifier = Substitute.For<IRepositoryEventNotifier>();

        var sut = new RepositoryWatcherService(store, repositoryService, notifier,
            NullLogger<RepositoryWatcherService>.Instance);

        await sut.StartAsync(CancellationToken.None);

        repositoryService.Received(1).RefreshCurrentBranch(repoId);

        await sut.StopAsync(CancellationToken.None);
        sut.Dispose();
    }

    [Fact]
    public async Task OnExternalBranchChange_RefreshesCurrentBranchBeforeNotifying()
    {
        var path = CreateGitRepo("watcher-repo");
        Run("git checkout -b feature", path);
        Run("git checkout main", path);

        var repoId = "watcher-id";
        var info = new RepositoryInfo { Id = repoId, Name = "repo", LocalPath = path, CurrentBranch = "master" };

        var store = Substitute.For<IRepositoryStore>();
        store.Load().Returns([info]);

        var repositoryService = Substitute.For<IRepositoryService>();
        var notifier = Substitute.For<IRepositoryEventNotifier>();

        var callOrder = new List<string>();
        repositoryService.When(s => s.RefreshCurrentBranch(repoId))
            .Do(_ => callOrder.Add("refresh"));
        notifier.NotifyBranchChangedAsync(repoId)
            .Returns(_ => { callOrder.Add("notify"); return Task.CompletedTask; });

        var sut = new RepositoryWatcherService(store, repositoryService, notifier,
            NullLogger<RepositoryWatcherService>.Instance);

        await sut.StartAsync(CancellationToken.None);

        // Extern Branch wechseln – schreibt in .git/HEAD
        Run("git checkout feature", path);

        // Warten auf Debounce (300ms) + Puffer für FSEvents-Latenz (macOS)
        await Task.Delay(1500);

        repositoryService.Received().RefreshCurrentBranch(repoId);
        await notifier.Received().NotifyBranchChangedAsync(repoId);

        // "refresh" tritt zweimal auf: einmal beim Start, einmal beim externen Branch-Wechsel
        Assert.Equal(["refresh", "refresh", "notify"], callOrder);

        await sut.StopAsync(CancellationToken.None);
        sut.Dispose();
    }

    [Fact]
    public void ScheduleDebounced_ConcurrentCalls_DoesNotThrow()
    {
        var store = Substitute.For<IRepositoryStore>();
        store.Load().Returns([]);

        var sut = new RepositoryWatcherService(
            store,
            Substitute.For<IRepositoryService>(),
            Substitute.For<IRepositoryEventNotifier>(),
            NullLogger<RepositoryWatcherService>.Instance);

        const string repoId = "race-test-repo";

        var exception = Record.Exception(() =>
            Parallel.For(0, 20, _ =>
                sut.ScheduleDebounced(repoId, () => Task.CompletedTask)));

        Assert.Null(exception);
        sut.Dispose();
    }

    public void Dispose()
    {
        if (!Directory.Exists(_tempPath)) return;
        foreach (var file in Directory.EnumerateFiles(_tempPath, "*", SearchOption.AllDirectories))
            File.SetAttributes(file, FileAttributes.Normal);
        Directory.Delete(_tempPath, recursive: true);
    }
}
