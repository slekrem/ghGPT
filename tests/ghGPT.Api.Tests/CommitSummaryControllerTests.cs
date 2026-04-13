using ghGPT.Api.Controllers;
using ghGPT.Ai.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using System.Text;

namespace ghGPT.Api.Tests;

public class CommitSummaryControllerTests
{
    private readonly ICommitSummaryService _service = Substitute.For<ICommitSummaryService>();
    private readonly CommitSummaryController _controller;

    public CommitSummaryControllerTests()
    {
        _controller = new CommitSummaryController(_service);

        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task StreamSummary_WritesTokensAsSSE()
    {
        _service.StreamSummaryAsync("repo-1", 10, Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("In dieser Woche wurde die Auth-Funktion implementiert."));

        await _controller.StreamSummary("repo-1", count: 10, CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("data:", body);
        Assert.Contains("Auth-Funktion", body);
    }

    [Fact]
    public async Task StreamSummary_WritesDoneEvent()
    {
        _service.StreamSummaryAsync("repo-1", 10, Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await _controller.StreamSummary("repo-1", count: 10, CancellationToken.None);

        Assert.Contains("event: done", ReadResponseBody());
    }

    [Fact]
    public async Task StreamSummary_SetsSSEContentType()
    {
        _service.StreamSummaryAsync("repo-1", 10, Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable());

        await _controller.StreamSummary("repo-1", count: 10, CancellationToken.None);

        Assert.Equal("text/event-stream",
            _controller.HttpContext.Response.Headers.ContentType.ToString());
    }

    [Fact]
    public async Task StreamSummary_PassesCountToService()
    {
        _service.StreamSummaryAsync("repo-1", 25, Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await _controller.StreamSummary("repo-1", count: 25, CancellationToken.None);

        _ = _service.Received(1).StreamSummaryAsync("repo-1", 25, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StreamSummary_OnException_WritesErrorEvent()
    {
        _service.StreamSummaryAsync("repo-1", 10, Arg.Any<CancellationToken>())
            .Returns(ThrowingAsyncEnumerable());

        await _controller.StreamSummary("repo-1", count: 10, CancellationToken.None);

        Assert.Contains("event: error", ReadResponseBody());
    }

    private string ReadResponseBody()
    {
        var stream = _controller.HttpContext.Response.Body;
        stream.Seek(0, SeekOrigin.Begin);
        return Encoding.UTF8.GetString(((MemoryStream)stream).ToArray());
    }

    private static async IAsyncEnumerable<string> AsyncEnumerable(params string[] tokens)
    {
        foreach (var token in tokens)
            yield return await Task.FromResult(token);
    }

    private static async IAsyncEnumerable<string> ThrowingAsyncEnumerable()
    {
        await Task.Yield();
        throw new InvalidOperationException("Ollama nicht erreichbar");
#pragma warning disable CS0162
        yield break;
#pragma warning restore CS0162
    }
}
