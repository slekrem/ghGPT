using GhCli.Net;
using GhCli.Net.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using System.Text.Json;

namespace GhCli.Net.Tests;

public class UserClientTests
{
    private readonly IGhCliRunner _runner = Substitute.For<IGhCliRunner>();
    private readonly IUserClient _sut;

    public UserClientTests()
    {
        _sut = new GhClient(_runner).User;
    }

    [Fact]
    public async Task GetCurrentAsync_ReturnsUser()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new
        {
            login = "slekrem",
            name = "Stefan",
            email = "stefan@example.com",
            bio = (string?)null,
            company = (string?)null,
            location = (string?)null,
            html_url = "https://github.com/slekrem",
            avatar_url = "https://avatars.githubusercontent.com/u/1",
            public_repos = 42,
            followers = 10,
            following = 5,
            created_at = "2020-01-01T00:00:00Z"
        });
        _runner.RunAsync("api", "user").Returns(json);

        // Act
        var result = await _sut.GetCurrentAsync();

        // Assert
        Assert.Equal("slekrem", result.Login);
        Assert.Equal("Stefan", result.Name);
        Assert.Equal(42, result.PublicRepos);
    }

    [Fact]
    public async Task GetCurrentAsync_ThrowsWhenResponseIsInvalid()
    {
        // Arrange
        _runner.RunAsync("api", "user").Returns("null");

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.GetCurrentAsync());
    }

    [Fact]
    public async Task IsAuthenticatedAsync_ReturnsTrueWhenAuthenticated()
    {
        // Arrange
        _runner.RunAsync("auth", "status").Returns(string.Empty);

        // Act
        var result = await _sut.IsAuthenticatedAsync();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsAuthenticatedAsync_ReturnsFalseWhenNotAuthenticated()
    {
        // Arrange
        _runner.RunAsync("auth", "status").Throws(new InvalidOperationException("gh CLI Fehler: not authenticated"));

        // Act
        var result = await _sut.IsAuthenticatedAsync();

        // Assert
        Assert.False(result);
    }
}
