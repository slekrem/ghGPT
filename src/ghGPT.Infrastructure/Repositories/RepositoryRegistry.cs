using ghGPT.Core.Repositories;
using Git.Process.Abstractions;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryRegistry(IRepositoryStore store, IGitRunner runner)
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

    public async Task<RepositoryInfo> BuildInfoAsync(string localPath)
    {
        var name = Path.GetFileName(localPath.TrimEnd(Path.DirectorySeparatorChar));
        var remoteUrl = await TryGetRemoteUrlAsync(localPath);
        var branch = await GetCurrentBranchAsync(localPath);

        return new RepositoryInfo
        {
            Id = Guid.NewGuid().ToString(),
            Name = name,
            LocalPath = localPath,
            RemoteUrl = remoteUrl,
            CurrentBranch = branch
        };
    }

    private async Task<string?> TryGetRemoteUrlAsync(string localPath)
    {
        try
        {
            var output = await runner.RunAsync(localPath, "config", "--get", "remote.origin.url");
            var trimmed = output.Trim();
            return string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }
        catch (InvalidOperationException)
        {
            return null;
        }
    }

    private async Task<string> GetCurrentBranchAsync(string localPath)
    {
        try
        {
            var output = await runner.RunAsync(localPath, "rev-parse", "--abbrev-ref", "HEAD");
            return output.Trim();
        }
        catch (InvalidOperationException)
        {
            return string.Empty;
        }
    }
}
