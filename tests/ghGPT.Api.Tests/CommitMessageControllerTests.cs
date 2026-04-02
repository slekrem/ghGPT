using ghGPT.Api.Controllers;
using ghGPT.Core.Ai;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using System.Text;

namespace ghGPT.Api.Tests;

public class CommitMessageControllerTests
{
    private readonly ICommitMessageService _service = Substitute.For<ICommitMessageService>();
    private readonly CommitMessageController _controller;

    public CommitMessageControllerTests()
    {
        _controller = new CommitMessageController(_service);

        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    [Fact]
    public async Task StreamCommitMessage_WritesTokensAsSSE()
    {
        _service.StreamCommitMessageAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("feat(api): ", "add endpoint"));

        await _controller.StreamCommitMessage("repo-1", CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("data:", body);
        Assert.Contains("feat(api): ", body);
        Assert.Contains("add endpoint", body);
    }

    [Fact]
    public async Task StreamCommitMessage_WritesDoneEvent()
    {
        _service.StreamCommitMessageAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("fix: typo"));

        await _controller.StreamCommitMessage("repo-1", CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("event: done", body);
    }

    [Fact]
    public async Task StreamCommitMessage_SetsSSEContentType()
    {
        _service.StreamCommitMessageAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable());

        await _controller.StreamCommitMessage("repo-1", CancellationToken.None);

        Assert.Equal("text/event-stream",
            _controller.HttpContext.Response.Headers.ContentType.ToString());
    }

    [Fact]
    public async Task StreamCommitMessage_OnException_WritesErrorEvent()
    {
        _service.StreamCommitMessageAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(ThrowingAsyncEnumerable());

        await _controller.StreamCommitMessage("repo-1", CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("event: error", body);
    }

    // --- Helpers ---

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
