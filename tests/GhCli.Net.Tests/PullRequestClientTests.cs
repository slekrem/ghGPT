using GhCli.Net;
using GhCli.Net.Abstractions;
using NSubstitute;
using System.Text.Json;

namespace GhCli.Net.Tests;

public class PullRequestClientTests
{
    private readonly IGhCliRunner _runner = Substitute.For<IGhCliRunner>();
    private readonly IPullRequestClient _sut;

    public PullRequestClientTests()
    {
        _sut = new GhClient(_runner).PullRequest;
    }

    [Fact]
    public async Task ListAsync_ReturnsPullRequests()
    {
        var json = JsonSerializer.Serialize(new[]
        {
            new
            {
                number = 42,
                title = "Fix bug",
                state = "OPEN",
                author = new { login = "slekrem", avatarUrl = "https://avatars.github.com/u/1" },
                headRefName = "fix/bug",
                baseRefName = "main",
                isDraft = false,
                mergeable = "MERGEABLE",
                labels = new[] { new { name = "bug" } },
                createdAt = "2026-04-01T10:00:00Z",
                updatedAt = "2026-04-02T10:00:00Z",
                url = "https://github.com/owner/repo/pull/42"
            }
        });

        _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

        var result = await _sut.ListAsync("owner", "repo");

        Assert.Single(result);
        Assert.Equal(42, result[0].Number);
        Assert.Equal("Fix bug", result[0].Title);
        Assert.Equal("slekrem", result[0].Author.Login);
        Assert.Equal("bug", result[0].Labels[0].Name);
    }

    [Fact]
    public async Task ListAsync_PassesCorrectArguments()
    {
        _runner.RunAsync(Arg.Any<string[]>()).Returns("[]");

        await _sut.ListAsync("slekrem", "ghGPT", state: "closed", limit: 50);

        await _runner.Received(1).RunAsync(
            "pr", "list",
            "--repo", "slekrem/ghGPT",
            "--state", "closed",
            "--limit", "50",
            "--json", Arg.Any<string>());
    }

    [Fact]
    public async Task ListAsync_ReturnsEmptyList_WhenNoPullRequests()
    {
        _runner.RunAsync(Arg.Any<string[]>()).Returns("[]");

        var result = await _sut.ListAsync("owner", "repo");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetDetailAsync_ReturnsPullRequestDetail()
    {
        var json = JsonSerializer.Serialize(new
        {
            number = 42,
            title = "Fix bug",
            state = "OPEN",
            author = new { login = "slekrem", avatarUrl = "https://avatars.github.com/u/1" },
            headRefName = "fix/bug",
            baseRefName = "main",
            isDraft = false,
            body = "Fixes #41",
            labels = Array.Empty<object>(),
            reviews = new[]
            {
                new { author = new { login = "reviewer" }, state = "APPROVED", submittedAt = "2026-04-02T09:00:00Z" }
            },
            files = new[]
            {
                new { path = "src/Foo.cs", additions = 10, deletions = 2, changeType = "MODIFIED" }
            },
            statusCheckRollup = new[]
            {
                new { name = "CI", state = "SUCCESS", conclusion = "SUCCESS" }
            },
            url = "https://github.com/owner/repo/pull/42",
            createdAt = "2026-04-01T10:00:00Z",
            updatedAt = "2026-04-02T10:00:00Z"
        });

        _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

        var result = await _sut.GetDetailAsync("owner", "repo", 42);

        Assert.Equal(42, result.Number);
        Assert.Equal("Fixes #41", result.Body);
        Assert.Single(result.Reviews);
        Assert.Equal("reviewer", result.Reviews[0].Author.Login);
        Assert.Equal("APPROVED", result.Reviews[0].State);
        Assert.Single(result.Files);
        Assert.Equal("src/Foo.cs", result.Files[0].Path);
        Assert.Equal(12, result.Files[0].Changes);
        Assert.True(result.CiPassing);
        Assert.True(result.CiHasCombinedStatus);
    }

    [Fact]
    public async Task GetDetailAsync_PassesCorrectArguments()
    {
        var json = JsonSerializer.Serialize(new
        {
            number = 1, title = "", state = "", author = new { login = "", avatarUrl = "" },
            headRefName = "", baseRefName = "", isDraft = false, body = "",
            labels = Array.Empty<object>(), reviews = Array.Empty<object>(),
            files = Array.Empty<object>(), statusCheckRollup = Array.Empty<object>(),
            url = "", createdAt = "2026-01-01T00:00:00Z", updatedAt = "2026-01-01T00:00:00Z"
        });

        _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

        await _sut.GetDetailAsync("slekrem", "ghGPT", 42);

        await _runner.Received(1).RunAsync(
            "pr", "view", "42",
            "--repo", "slekrem/ghGPT",
            "--json", Arg.Any<string>());
    }

    [Fact]
    public async Task ListAsync_ThrowsArgumentException_WhenOwnerIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.ListAsync("", "repo"));
    }

    [Fact]
    public async Task GetDetailAsync_ThrowsArgumentException_WhenNumberIsZero()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => _sut.GetDetailAsync("owner", "repo", 0));
    }
}
