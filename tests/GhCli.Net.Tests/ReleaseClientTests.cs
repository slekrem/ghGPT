using GhCli.Net;
using GhCli.Net.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using System.Text.Json;

namespace GhCli.Net.Tests;

public class ReleaseClientTests
{
    private readonly IGhCliRunner _runner = Substitute.For<IGhCliRunner>();
    private readonly IReleaseClient _sut;

    public ReleaseClientTests()
    {
        _sut = new GhClient(_runner).Release;
    }

    [Fact]
    public async Task ListAsync_ReturnsReleases()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new[]
        {
            new
            {
                tagName = "v1.0.0",
                name = "Version 1.0.0",
                publishedAt = "2026-01-01T00:00:00Z",
                isDraft = false,
                isPrerelease = false,
                isLatest = true
            }
        });
        _runner.RunAsync("release", "list", "--repo", "slekrem/ghGPT", "--limit", "30", "--json", Arg.Any<string>())
            .Returns(json);

        // Act
        var result = await _sut.ListAsync("slekrem", "ghGPT");

        // Assert
        Assert.Single(result);
        Assert.Equal("v1.0.0", result[0].TagName);
        Assert.True(result[0].IsLatest);
    }

    [Fact]
    public async Task ListAsync_ThrowsWhenLimitIsZero()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => _sut.ListAsync("slekrem", "ghGPT", 0));
    }

    [Fact]
    public async Task GetLatestAsync_ReturnsReleaseDetail()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new
        {
            tagName = "v1.0.0",
            name = "Version 1.0.0",
            body = "Release notes...",
            publishedAt = "2026-01-01T00:00:00Z",
            isDraft = false,
            isPrerelease = false,
            url = "https://github.com/slekrem/ghGPT/releases/tag/v1.0.0",
            author = new { login = "slekrem" }
        });
        _runner.RunAsync("release", "view", "--repo", "slekrem/ghGPT", "--json", Arg.Any<string>())
            .Returns(json);

        // Act
        var result = await _sut.GetLatestAsync("slekrem", "ghGPT");

        // Assert
        Assert.Equal("v1.0.0", result.TagName);
        Assert.Equal("Release notes...", result.Body);
        Assert.Equal("slekrem", result.Author.Login);
    }

    [Fact]
    public async Task GetLatestAsync_ThrowsWhenOwnerIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.GetLatestAsync("", "ghGPT"));
    }

    [Fact]
    public async Task GetByTagAsync_ReturnsReleaseDetail()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new
        {
            tagName = "v1.0.0-rc.1",
            name = "Release Candidate 1",
            body = (string?)null,
            publishedAt = "2026-01-01T00:00:00Z",
            isDraft = false,
            isPrerelease = true,
            url = "https://github.com/slekrem/ghGPT/releases/tag/v1.0.0-rc.1",
            author = new { login = "slekrem" }
        });
        _runner.RunAsync("release", "view", "v1.0.0-rc.1", "--repo", "slekrem/ghGPT", "--json", Arg.Any<string>())
            .Returns(json);

        // Act
        var result = await _sut.GetByTagAsync("slekrem", "ghGPT", "v1.0.0-rc.1");

        // Assert
        Assert.Equal("v1.0.0-rc.1", result.TagName);
        Assert.True(result.IsPrerelease);
    }

    [Fact]
    public async Task GetByTagAsync_ThrowsWhenTagIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.GetByTagAsync("slekrem", "ghGPT", ""));
    }
}
