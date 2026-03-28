using ghGPT.Core.Repositories;
using LibGit2Sharp;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryService(IRepositoryStore store) : IRepositoryService
{
    private readonly List<RepositoryInfo> _repos = [.. store.Load()];

    public IReadOnlyList<RepositoryInfo> GetAll() => _repos.AsReadOnly();

    public Task<RepositoryInfo> CreateAsync(string localPath, string name)
    {
        Directory.CreateDirectory(localPath);
        LibGit2Sharp.Repository.Init(localPath);

        var info = BuildInfo(localPath);
        _repos.Add(info);
        store.Save(_repos);
        return Task.FromResult(info);
    }

    public Task<RepositoryInfo> ImportAsync(string localPath)
    {
        if (!LibGit2Sharp.Repository.IsValid(localPath))
            throw new InvalidOperationException($"'{localPath}' ist kein gültiges Git-Repository.");

        if (_repos.Any(r => r.LocalPath == localPath))
            throw new InvalidOperationException($"Repository '{localPath}' ist bereits importiert.");

        var info = BuildInfo(localPath);
        _repos.Add(info);
        store.Save(_repos);
        return Task.FromResult(info);
    }

    public Task<RepositoryInfo> CloneAsync(string remoteUrl, string localPath, IProgress<string>? progress = null)
    {
        var options = new CloneOptions();

        if (progress is not null)
        {
            options.OnCheckoutProgress = (path, completed, total) =>
                progress.Report($"Checkout: {path} ({completed}/{total})");

            options.FetchOptions.OnProgress = message =>
            {
                progress.Report(message);
                return true;
            };

            options.FetchOptions.OnTransferProgress = transferProgress =>
            {
                progress.Report(
                    $"Objekte empfangen: {transferProgress.ReceivedObjects}/{transferProgress.TotalObjects}");
                return true;
            };
        }

        LibGit2Sharp.Repository.Clone(remoteUrl, localPath, options);

        var info = BuildInfo(localPath);
        _repos.Add(info);
        store.Save(_repos);
        return Task.FromResult(info);
    }

    private static RepositoryInfo BuildInfo(string localPath)
    {
        using var repo = new LibGit2Sharp.Repository(localPath);
        var name = Path.GetFileName(localPath.TrimEnd(Path.DirectorySeparatorChar));
        var remoteUrl = repo.Network.Remotes["origin"]?.Url;
        var branch = repo.Head.FriendlyName;
        var id = Guid.NewGuid().ToString();
        return new RepositoryInfo(id, name, localPath, remoteUrl, branch);
    }
}
