using GhCli.Net;
using GhCli.Net.Abstractions;
using GhCli.Net.Discussions.Models;
using NSubstitute;
using System.Text.Json;

namespace GhCli.Net.Tests;

public class DiscussionClientTests
{
    private readonly IGhCliRunner _runner = Substitute.For<IGhCliRunner>();
    private readonly IDiscussionClient _sut;

    public DiscussionClientTests()
    {
        _sut = new GhClient(_runner).Discussion;
    }

    [Fact]
    public async Task ListAsync_ReturnsDiscussions()
    {
        var json = JsonSerializer.Serialize(new
        {
            data = new
            {
                repository = new
                {
                    discussions = new
                    {
                        nodes = new[]
                        {
                            new
                            {
                                number = 1,
                                title = "Test Discussion",
                                body = "Body",
                                url = "https://github.com/owner/repo/discussions/1",
                                createdAt = "2026-04-01T12:00:00Z",
                                author = new { login = "slekrem" },
                                category = new { name = "Ideas" }
                            }
                        }
                    }
                }
            }
        });

        _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

        var result = await _sut.ListAsync("owner", "repo");

        Assert.Single(result);
        Assert.Equal(1, result[0].Number);
        Assert.Equal("Test Discussion", result[0].Title);
        Assert.Equal("slekrem", result[0].Author.Login);
        Assert.Equal("Ideas", result[0].Category.Name);
    }

    [Fact]
    public async Task ListAsync_PassesCorrectArguments()
    {
        var json = JsonSerializer.Serialize(new
        {
            data = new { repository = new { discussions = new { nodes = Array.Empty<object>() } } }
        });

        _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

        await _sut.ListAsync("slekrem", "ghGPT", limit: 10);

        await _runner.Received(1).RunAsync(
            "api", "graphql",
            "-f", Arg.Is<string>(q => q.Contains("query=")),
            "-f", "owner=slekrem",
            "-f", "repo=ghGPT",
            "-F", "limit=10");
    }

    [Fact]
    public async Task ListAsync_ReturnsEmptyList_WhenNoDiscussions()
    {
        var json = JsonSerializer.Serialize(new
        {
            data = new { repository = new { discussions = new { nodes = Array.Empty<object>() } } }
        });

        _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

        var result = await _sut.ListAsync("owner", "repo");

        Assert.Empty(result);
    }

    [Fact]
    public async Task ListAsync_ThrowsInvalidOperationException_WhenRunnerFails()
    {
        _runner.RunAsync(Arg.Any<string[]>())
            .Returns<string>(_ => throw new InvalidOperationException("gh CLI ist nicht installiert oder nicht im PATH."));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.ListAsync("owner", "repo"));
    }
}
