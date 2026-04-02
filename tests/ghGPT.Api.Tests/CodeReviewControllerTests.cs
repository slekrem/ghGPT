using ghGPT.Api.Controllers;
using ghGPT.Core.Ai;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using System.Text;

namespace ghGPT.Api.Tests;

public class CodeReviewControllerTests
{
    private readonly ICodeReviewService _service = Substitute.For<ICodeReviewService>();
    private readonly CodeReviewController _controller;

    public CodeReviewControllerTests()
    {
        _controller = new CodeReviewController(_service);

        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    [Fact]
    public async Task StreamReview_WritesTokensAsSSE()
    {
        _service.StreamReviewAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("## Zusammenfassung", "\nTest"));

        await _controller.StreamReview("repo-1", CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("data:", body);
        Assert.Contains("## Zusammenfassung", body);
    }

    [Fact]
    public async Task StreamReview_WritesDoneEvent()
    {
        _service.StreamReviewAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable("ok"));

        await _controller.StreamReview("repo-1", CancellationToken.None);

        Assert.Contains("event: done", ReadResponseBody());
    }

    [Fact]
    public async Task StreamReview_SetsSSEContentType()
    {
        _service.StreamReviewAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable());

        await _controller.StreamReview("repo-1", CancellationToken.None);

        Assert.Equal("text/event-stream",
            _controller.HttpContext.Response.Headers.ContentType.ToString());
    }

    [Fact]
    public async Task StreamReview_OnException_WritesErrorEvent()
    {
        _service.StreamReviewAsync("repo-1", Arg.Any<CancellationToken>())
            .Returns(ThrowingAsyncEnumerable());

        await _controller.StreamReview("repo-1", CancellationToken.None);

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
