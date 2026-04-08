namespace ghGPT.Core.Releases;

public interface IReleaseService
{
    Task<IReadOnlyList<ReleaseListItem>> GetReleasesAsync(string owner, string repo, int limit = 30);
    Task<ReleaseDetail> GetLatestAsync(string owner, string repo);
    Task<ReleaseDetail> GetByTagAsync(string owner, string repo, string tag);
}
