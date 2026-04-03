using ghGPT.Api.Controllers;
using ghGPT.Core.Ai;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using System.Text;

namespace ghGPT.Api.Tests;

public class ChatControllerTests
{
    private readonly IChatService _chatService = Substitute.For<IChatService>();
    private readonly ChatController _controller;

    public ChatControllerTests()
    {
        _controller = new ChatController(_chatService);

        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    // --- SSE-Grundverhalten ---

    [Fact]
    public async Task StreamChat_SetsSSEContentType()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable());

        await _controller.StreamChat(new ChatRequest { Message = "Test" }, CancellationToken.None);

        Assert.Equal("text/event-stream",
            _controller.HttpContext.Response.Headers.ContentType.ToString());
    }

    [Fact]
    public async Task StreamChat_WritesDoneEventAtEnd()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(AsyncEnumerable());

        await _controller.StreamChat(new ChatRequest { Message = "Test" }, CancellationToken.None);

        Assert.Contains("event: done", ReadResponseBody());
    }

    // --- TokenEvent ---

    [Fact]
    public async Task StreamChat_TokenEvent_WritesDataLine()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(new TokenEvent("Hallo")));

        await _controller.StreamChat(new ChatRequest { Message = "Hallo" }, CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("data:", body);
        Assert.Contains("Hallo", body);
    }

    [Fact]
    public async Task StreamChat_MultipleTokenEvents_WritesAllTokens()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(new TokenEvent("Hallo"), new TokenEvent(" Welt")));

        await _controller.StreamChat(new ChatRequest { Message = "Test" }, CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("Hallo", body);
        Assert.Contains("Welt", body);
    }

    [Fact]
    public async Task StreamChat_TokenEvent_DoesNotWriteToolEvent()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(new TokenEvent("nur Text")));

        await _controller.StreamChat(new ChatRequest { Message = "Test" }, CancellationToken.None);

        Assert.DoesNotContain("event: tool", ReadResponseBody());
    }

    // --- ToolExecutedEvent ---

    [Fact]
    public async Task StreamChat_ToolExecutedEvent_WritesToolEvent()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(
                new ToolExecutedEvent("get_status", "get_status", true, "Keine Änderungen.")));

        await _controller.StreamChat(new ChatRequest { Message = "Status?" }, CancellationToken.None);

        Assert.Contains("event: tool", ReadResponseBody());
    }

    [Fact]
    public async Task StreamChat_ToolExecutedEvent_ContainsToolName()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(
                new ToolExecutedEvent("get_branches", "get_branches", true, "main, feature/x")));

        await _controller.StreamChat(new ChatRequest { Message = "Branches?" }, CancellationToken.None);

        Assert.Contains("get_branches", ReadResponseBody());
    }

    [Fact]
    public async Task StreamChat_ToolExecutedEvent_ContainsSuccessFlag()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(
                new ToolExecutedEvent("fetch", "fetch", true, "Fetch abgeschlossen.")));

        await _controller.StreamChat(new ChatRequest { Message = "Fetch!" }, CancellationToken.None);

        Assert.Contains("true", ReadResponseBody());
    }

    [Fact]
    public async Task StreamChat_ToolFollowedByToken_WritesToolEventThenData()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ChatEventEnumerable(
                new ToolExecutedEvent("get_status", "get_status", true, "Sauber."),
                new TokenEvent("Working tree ist sauber.")));

        await _controller.StreamChat(new ChatRequest { Message = "Status?" }, CancellationToken.None);

        var body = ReadResponseBody();
        Assert.Contains("event: tool", body);
        Assert.Contains("Working tree ist sauber.", body);
    }

    // --- Fehlerbehandlung ---

    [Fact]
    public async Task StreamChat_OnException_WritesErrorEvent()
    {
        _chatService.StreamAsync(Arg.Any<ChatRequest>(), Arg.Any<CancellationToken>())
            .Returns(ThrowingEnumerable());

        await _controller.StreamChat(new ChatRequest { Message = "Test" }, CancellationToken.None);

        Assert.Contains("event: error", ReadResponseBody());
    }

    // --- Helper ---

    private string ReadResponseBody()
    {
        var stream = _controller.HttpContext.Response.Body;
        stream.Seek(0, SeekOrigin.Begin);
        return Encoding.UTF8.GetString(((MemoryStream)stream).ToArray());
    }

    private static async IAsyncEnumerable<ChatEvent> AsyncEnumerable(params ChatEvent[] events)
    {
        foreach (var e in events)
            yield return await Task.FromResult(e);
    }

    private static async IAsyncEnumerable<ChatEvent> ChatEventEnumerable(params ChatEvent[] events)
    {
        foreach (var e in events)
            yield return await Task.FromResult(e);
    }

    private static async IAsyncEnumerable<ChatEvent> ThrowingEnumerable()
    {
        await Task.Yield();
        throw new InvalidOperationException("Ollama nicht erreichbar");
#pragma warning disable CS0162
        yield break;
#pragma warning restore CS0162
    }
}
