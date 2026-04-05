using GhCli.Net.Releases.Models;

namespace GhCli.Net.Abstractions;

public interface IReleaseClient
{
    Task<IReadOnlyList<Release>> ListAsync(string owner, string repo, int limit = 30);
    Task<ReleaseDetail> GetLatestAsync(string owner, string repo);
    Task<ReleaseDetail> GetByTagAsync(string owner, string repo, string tag);
}
