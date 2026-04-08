using GhCli.Net.Abstractions;
using ghGPT.Core.Releases;

namespace ghGPT.Infrastructure.Releases;

public class ReleaseService(IReleaseClient releaseClient) : IReleaseService
{
    public async Task<IReadOnlyList<ReleaseListItem>> GetReleasesAsync(string owner, string repo, int limit = 30)
    {
        var releases = await releaseClient.ListAsync(owner, repo, limit);
        return releases.Select(r => new ReleaseListItem
        {
            TagName = r.TagName,
            Name = r.Name,
            IsDraft = r.IsDraft,
            IsPrerelease = r.IsPrerelease,
            IsLatest = r.IsLatest,
            PublishedAt = r.PublishedAt,
            Url = $"https://github.com/{owner}/{repo}/releases/tag/{r.TagName}"
        }).ToList();
    }

    public async Task<ReleaseDetail> GetLatestAsync(string owner, string repo)
    {
        var r = await releaseClient.GetLatestAsync(owner, repo);
        return Map(r);
    }

    public async Task<ReleaseDetail> GetByTagAsync(string owner, string repo, string tag)
    {
        var r = await releaseClient.GetByTagAsync(owner, repo, tag);
        return Map(r);
    }

    private static ReleaseDetail Map(GhCli.Net.Releases.Models.ReleaseDetail r) => new()
    {
        TagName = r.TagName,
        Name = r.Name,
        IsDraft = r.IsDraft,
        IsPrerelease = r.IsPrerelease,
        Body = r.Body,
        PublishedAt = r.PublishedAt,
        Url = r.Url,
        AuthorLogin = r.Author.Login
    };
}
