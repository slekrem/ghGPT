using GhCli.Net.Abstractions;
using GhCli.Net.Releases.Models;
using ghGPT.Infrastructure.Releases;
using NSubstitute;

namespace ghGPT.Infrastructure.Tests;

public class ReleaseServiceTests
{
    private readonly IReleaseClient _client = Substitute.For<IReleaseClient>();
    private readonly ReleaseService _sut;

    public ReleaseServiceTests()
    {
        _sut = new ReleaseService(_client);
    }

    // --- GetReleasesAsync ---

    [Fact]
    public async Task GetReleasesAsync_MapsAllFields()
    {
        _client.ListAsync("owner", "repo", 30).Returns([
            new Release
            {
                TagName = "v1.0.0",
                Name = "Version 1.0.0",
                IsDraft = false,
                IsPrerelease = false,
                IsLatest = true,
                PublishedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
                Url = "https://github.com/owner/repo/releases/tag/v1.0.0"
            }
        ]);

        var result = await _sut.GetReleasesAsync("owner", "repo");

        Assert.Single(result);
        var item = result[0];
        Assert.Equal("v1.0.0", item.TagName);
        Assert.Equal("Version 1.0.0", item.Name);
        Assert.False(item.IsDraft);
        Assert.False(item.IsPrerelease);
        Assert.True(item.IsLatest);
        Assert.Equal(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), item.PublishedAt);
        Assert.Equal("https://github.com/owner/repo/releases/tag/v1.0.0", item.Url); // constructed, not from API
    }

    [Fact]
    public async Task GetReleasesAsync_ReturnsEmptyList_WhenNoReleases()
    {
        _client.ListAsync("owner", "repo", 30).Returns([]);

        var result = await _sut.GetReleasesAsync("owner", "repo");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetReleasesAsync_ReturnsMultipleReleases()
    {
        _client.ListAsync("owner", "repo", 30).Returns([
            new Release { TagName = "v2.0.0", IsLatest = true },
            new Release { TagName = "v1.0.0", IsLatest = false }
        ]);

        var result = await _sut.GetReleasesAsync("owner", "repo");

        Assert.Equal(2, result.Count);
        Assert.Equal("v2.0.0", result[0].TagName);
        Assert.Equal("v1.0.0", result[1].TagName);
    }

    [Fact]
    public async Task GetReleasesAsync_PassesLimitToClient()
    {
        _client.ListAsync("owner", "repo", 10).Returns([]);

        await _sut.GetReleasesAsync("owner", "repo", limit: 10);

        await _client.Received(1).ListAsync("owner", "repo", 10);
    }

    // --- GetLatestAsync ---

    [Fact]
    public async Task GetLatestAsync_MapsAllFields()
    {
        _client.GetLatestAsync("owner", "repo").Returns(new ReleaseDetail
        {
            TagName = "v1.0.0",
            Name = "Version 1.0.0",
            IsDraft = false,
            IsPrerelease = false,
            Body = "## Changelog\n- Feature A",
            PublishedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            Url = "https://github.com/owner/repo/releases/tag/v1.0.0",
            Author = new ReleaseAuthor { Login = "slekrem" }
        });

        var result = await _sut.GetLatestAsync("owner", "repo");

        Assert.Equal("v1.0.0", result.TagName);
        Assert.Equal("Version 1.0.0", result.Name);
        Assert.False(result.IsDraft);
        Assert.False(result.IsPrerelease);
        Assert.Equal("## Changelog\n- Feature A", result.Body);
        Assert.Equal(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), result.PublishedAt);
        Assert.Equal("https://github.com/owner/repo/releases/tag/v1.0.0", result.Url);
        Assert.Equal("slekrem", result.AuthorLogin);
    }

    [Fact]
    public async Task GetLatestAsync_MapsNullBody()
    {
        _client.GetLatestAsync("owner", "repo").Returns(new ReleaseDetail
        {
            TagName = "v1.0.0",
            Body = null,
            Author = new ReleaseAuthor { Login = "slekrem" }
        });

        var result = await _sut.GetLatestAsync("owner", "repo");

        Assert.Null(result.Body);
    }

    // --- GetByTagAsync ---

    [Fact]
    public async Task GetByTagAsync_MapsAllFields()
    {
        _client.GetByTagAsync("owner", "repo", "v1.0.0-rc.1").Returns(new ReleaseDetail
        {
            TagName = "v1.0.0-rc.1",
            Name = "Release Candidate 1",
            IsDraft = false,
            IsPrerelease = true,
            Body = null,
            PublishedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            Url = "https://github.com/owner/repo/releases/tag/v1.0.0-rc.1",
            Author = new ReleaseAuthor { Login = "slekrem" }
        });

        var result = await _sut.GetByTagAsync("owner", "repo", "v1.0.0-rc.1");

        Assert.Equal("v1.0.0-rc.1", result.TagName);
        Assert.True(result.IsPrerelease);
        Assert.False(result.IsDraft);
        Assert.Equal("slekrem", result.AuthorLogin);
    }

    [Fact]
    public async Task GetByTagAsync_PassesTagToClient()
    {
        _client.GetByTagAsync("owner", "repo", "v2.0.0").Returns(new ReleaseDetail
        {
            Author = new ReleaseAuthor { Login = "slekrem" }
        });

        await _sut.GetByTagAsync("owner", "repo", "v2.0.0");

        await _client.Received(1).GetByTagAsync("owner", "repo", "v2.0.0");
    }
}
