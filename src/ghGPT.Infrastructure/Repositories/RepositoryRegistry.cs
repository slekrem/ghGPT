using ghGPT.Core.Repositories;
using LibGit2Sharp;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryRegistry(IRepositoryStore store)
{
    private readonly List<RepositoryInfo> _repos = [.. store.Load()];
    private string? _activeRepoId;

    public IReadOnlyList<RepositoryInfo> GetAll() => _repos.AsReadOnly();

    public RepositoryInfo? GetActive() =>
        _activeRepoId is not null ? _repos.FirstOrDefault(r => r.Id == _activeRepoId) : null;

    public void SetActive(string id)
    {
        if (_repos.All(r => r.Id != id))
            throw new InvalidOperationException($"Repository '{id}' nicht gefunden.");
        _activeRepoId = id;
    }

    public RepositoryInfo GetById(string id) =>
        _repos.FirstOrDefault(r => r.Id == id)
        ?? throw new InvalidOperationException($"Repository '{id}' nicht gefunden.");

    public void Add(RepositoryInfo info)
    {
        _repos.Add(info);
        store.Save(_repos);
    }

    public void Remove(string id)
    {
        var repo = GetById(id);
        _repos.Remove(repo);
        if (_activeRepoId == id) _activeRepoId = null;
        store.Save(_repos);
    }

    public void Save() => store.Save(_repos);

    public static RepositoryInfo BuildInfo(string localPath)
    {
        using var repo = new LibGit2Sharp.Repository(localPath);
        var name = Path.GetFileName(localPath.TrimEnd(Path.DirectorySeparatorChar));
        var remoteUrl = repo.Network.Remotes["origin"]?.Url;
        var branch = repo.Head.FriendlyName;
        var id = Guid.NewGuid().ToString();
        return new RepositoryInfo
        {
            Id = id,
            Name = name,
            LocalPath = localPath,
            RemoteUrl = remoteUrl,
            CurrentBranch = branch
        };
    }
}
