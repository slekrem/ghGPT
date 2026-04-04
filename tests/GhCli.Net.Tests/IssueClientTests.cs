using GhCli.Net;
using GhCli.Net.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using System.Text.Json;

namespace GhCli.Net.Tests;

public class IssueClientTests
{
    private readonly IGhCliRunner _runner = Substitute.For<IGhCliRunner>();
    private readonly IIssueClient _sut;

    public IssueClientTests()
    {
        _sut = new GhClient(_runner).Issue;
    }

    [Fact]
    public async Task ListAsync_ReturnsIssues()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new[]
        {
            new
            {
                number = 1,
                title = "Fix bug",
                state = "OPEN",
                author = new { login = "slekrem" },
                labels = Array.Empty<object>(),
                assignees = Array.Empty<object>(),
                createdAt = "2026-01-01T00:00:00Z",
                updatedAt = "2026-01-01T00:00:00Z",
                url = "https://github.com/slekrem/ghGPT/issues/1"
            }
        });
        _runner.RunAsync("issue", "list", "--repo", "slekrem/ghGPT", "--state", "open", "--limit", "30", "--json", Arg.Any<string>())
            .Returns(json);

        // Act
        var result = await _sut.ListAsync("slekrem", "ghGPT");

        // Assert
        Assert.Single(result);
        Assert.Equal("Fix bug", result[0].Title);
        Assert.Equal(1, result[0].Number);
    }

    [Fact]
    public async Task ListAsync_ThrowsWhenOwnerIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.ListAsync("", "ghGPT"));
    }

    [Fact]
    public async Task ListAsync_ThrowsWhenLimitIsZero()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => _sut.ListAsync("slekrem", "ghGPT", limit: 0));
    }

    [Fact]
    public async Task GetDetailAsync_ReturnsIssueDetail()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new
        {
            number = 42,
            title = "Important bug",
            state = "OPEN",
            author = new { login = "slekrem" },
            labels = Array.Empty<object>(),
            assignees = Array.Empty<object>(),
            body = "This is the body.",
            createdAt = "2026-01-01T00:00:00Z",
            updatedAt = "2026-01-01T00:00:00Z",
            url = "https://github.com/slekrem/ghGPT/issues/42"
        });
        _runner.RunAsync("issue", "view", "42", "--repo", "slekrem/ghGPT", "--json", Arg.Any<string>())
            .Returns(json);

        // Act
        var result = await _sut.GetDetailAsync("slekrem", "ghGPT", 42);

        // Assert
        Assert.Equal(42, result.Number);
        Assert.Equal("Important bug", result.Title);
        Assert.Equal("This is the body.", result.Body);
    }

    [Fact]
    public async Task GetDetailAsync_ThrowsWhenNumberIsZero()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => _sut.GetDetailAsync("slekrem", "ghGPT", 0));
    }

    [Fact]
    public async Task AddCommentAsync_CallsRunner()
    {
        // Arrange
        _runner.RunAsync("issue", "comment", "42", "--repo", "slekrem/ghGPT", "--body", "Mein Kommentar")
            .Returns(string.Empty);

        // Act
        await _sut.AddCommentAsync("slekrem", "ghGPT", 42, "Mein Kommentar");

        // Assert
        await _runner.Received(1).RunAsync("issue", "comment", "42", "--repo", "slekrem/ghGPT", "--body", "Mein Kommentar");
    }

    [Fact]
    public async Task AddCommentAsync_ThrowsWhenBodyIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.AddCommentAsync("slekrem", "ghGPT", 42, ""));
    }
}
