using ghGPT.Ai.Ollama;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using System.Net;
using System.Text;

namespace ghGPT.Ai.Tests;

public class OllamaClientTests
{
    private readonly IAiSettingsService _settingsService = Substitute.For<IAiSettingsService>();

    public OllamaClientTests()
    {
        _settingsService.Load().Returns(new OllamaSettings
        {
            BaseUrl = "http://localhost:11434",
            Model = "llama3.2"
        });
    }

    // --- IsAvailableAsync ---

    [Fact]
    public async Task IsAvailableAsync_WhenServerResponds200_ReturnsTrue()
    {
        var sut = CreateClient(HttpStatusCode.OK, "{}");

        var result = await sut.IsAvailableAsync();

        Assert.True(result);
    }

    [Fact]
    public async Task IsAvailableAsync_WhenServerResponds500_ReturnsFalse()
    {
        var sut = CreateClient(HttpStatusCode.InternalServerError, "");

        var result = await sut.IsAvailableAsync();

        Assert.False(result);
    }

    [Fact]
    public async Task IsAvailableAsync_WhenConnectionFails_ReturnsFalse()
    {
        var handler = new ThrowingHttpMessageHandler(new HttpRequestException("connection refused"));
        var sut = new OllamaClient(_settingsService, NullLogger<OllamaClient>.Instance, new HttpClient(handler));

        var result = await sut.IsAvailableAsync();

        Assert.False(result);
    }

    // --- GetModelsAsync ---

    [Fact]
    public async Task GetModelsAsync_ParsesModelListFromResponse()
    {
        var json = """
            {
              "data": [
                { "id": "llama3.2", "created": 1700000000 },
                { "id": "mistral", "created": 1700001000 }
              ]
            }
            """;
        var sut = CreateClient(HttpStatusCode.OK, json);

        var result = await sut.GetModelsAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, m => m.Name == "llama3.2");
        Assert.Contains(result, m => m.Name == "mistral");
    }

    [Fact]
    public async Task GetModelsAsync_WhenDataIsNull_ReturnsEmptyList()
    {
        var sut = CreateClient(HttpStatusCode.OK, """{"data": null}""");

        var result = await sut.GetModelsAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetModelsAsync_WhenServerReturns500_Throws()
    {
        var sut = CreateClient(HttpStatusCode.InternalServerError, "");

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.GetModelsAsync());
    }

    [Fact]
    public async Task GetModelsAsync_MapsCreatedTimestampToModifiedAt()
    {
        var json = """{"data": [{ "id": "llama3.2", "created": 1700000000 }]}""";
        var sut = CreateClient(HttpStatusCode.OK, json);

        var result = await sut.GetModelsAsync();

        var expected = DateTimeOffset.FromUnixTimeSeconds(1700000000).UtcDateTime;
        Assert.Equal(expected, result[0].ModifiedAt);
    }

    // --- GenerateAsync ---

    [Fact]
    public async Task GenerateAsync_ParsesSSETokensFromStream()
    {
        var sse = BuildSseStream(
            """{"choices":[{"delta":{"content":"Hallo"}}]}""",
            """{"choices":[{"delta":{"content":" Welt"}}]}""");
        var sut = CreateClient(HttpStatusCode.OK, sse);

        var tokens = await CollectTokensAsync(sut);

        Assert.Equal(["Hallo", " Welt"], tokens);
    }

    [Fact]
    public async Task GenerateAsync_SkipsLinesWithoutDataPrefix()
    {
        var body = "event: start\ndata: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\n\ndata: [DONE]\n\n";
        var sut = CreateClient(HttpStatusCode.OK, body);

        var tokens = await CollectTokensAsync(sut);

        Assert.Single(tokens);
        Assert.Equal("ok", tokens[0]);
    }

    [Fact]
    public async Task GenerateAsync_StopsAtDoneMarker()
    {
        var body = "data: {\"choices\":[{\"delta\":{\"content\":\"vor\"}}]}\n\ndata: [DONE]\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"nach\"}}]}\n\n";
        var sut = CreateClient(HttpStatusCode.OK, body);

        var tokens = await CollectTokensAsync(sut);

        Assert.Single(tokens);
        Assert.Equal("vor", tokens[0]);
    }

    [Fact]
    public async Task GenerateAsync_SkipsChunksWithNullContent()
    {
        var sse = BuildSseStream(
            """{"choices":[{"delta":{"content":null}}]}""",
            """{"choices":[{"delta":{"content":"text"}}]}""");
        var sut = CreateClient(HttpStatusCode.OK, sse);

        var tokens = await CollectTokensAsync(sut);

        Assert.Single(tokens);
        Assert.Equal("text", tokens[0]);
    }

    [Fact]
    public async Task GenerateAsync_WhenServerReturns500_Throws()
    {
        var sut = CreateClient(HttpStatusCode.InternalServerError, "");

        await Assert.ThrowsAsync<HttpRequestException>(async () =>
            await CollectTokensAsync(sut));
    }

    // --- CompleteWithToolsAsync ---

    [Fact]
    public async Task CompleteWithToolsAsync_WhenFinishReasonIsStop_ReturnsContent()
    {
        var json = """
            {
              "choices": [{
                "finish_reason": "stop",
                "message": { "role": "assistant", "content": "Direkte Antwort" }
              }]
            }
            """;
        var sut = CreateClient(HttpStatusCode.OK, json);

        var result = await sut.CompleteWithToolsAsync([], [], CancellationToken.None);

        Assert.False(result.HasToolCalls);
        Assert.Equal("Direkte Antwort", result.Content);
    }

    [Fact]
    public async Task CompleteWithToolsAsync_WhenFinishReasonIsToolCalls_ReturnsToolCalls()
    {
        var json = """
            {
              "choices": [{
                "finish_reason": "tool_calls",
                "message": {
                  "role": "assistant",
                  "tool_calls": [{
                    "id": "call-1",
                    "function": { "name": "get_status", "arguments": "{}" }
                  }]
                }
              }]
            }
            """;
        var sut = CreateClient(HttpStatusCode.OK, json);

        var result = await sut.CompleteWithToolsAsync([], [], CancellationToken.None);

        Assert.True(result.HasToolCalls);
        Assert.Single(result.ToolCalls);
        Assert.Equal("get_status", result.ToolCalls[0].Name);
        Assert.Equal("call-1", result.ToolCalls[0].Id);
    }

    [Fact]
    public async Task CompleteWithToolsAsync_WhenToolCallHasArguments_ParsesArgumentsJson()
    {
        var json = """
            {
              "choices": [{
                "finish_reason": "tool_calls",
                "message": {
                  "tool_calls": [{
                    "id": "c1",
                    "function": { "name": "checkout_branch", "arguments": "{\"name\":\"main\"}" }
                  }]
                }
              }]
            }
            """;
        var sut = CreateClient(HttpStatusCode.OK, json);

        var result = await sut.CompleteWithToolsAsync([], [], CancellationToken.None);

        Assert.Equal("{\"name\":\"main\"}", result.ToolCalls[0].ArgumentsJson);
    }

    [Fact]
    public async Task CompleteWithToolsAsync_WhenChoicesIsEmpty_ReturnsEmptyContent()
    {
        var json = """{"choices": []}""";
        var sut = CreateClient(HttpStatusCode.OK, json);

        var result = await sut.CompleteWithToolsAsync([], [], CancellationToken.None);

        Assert.False(result.HasToolCalls);
        Assert.Equal(string.Empty, result.Content);
    }

    [Fact]
    public async Task CompleteWithToolsAsync_WhenServerReturns500_Throws()
    {
        var sut = CreateClient(HttpStatusCode.InternalServerError, "");

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            sut.CompleteWithToolsAsync([], [], CancellationToken.None));
    }

    // --- IAiSettingsService.Load() wird aufgerufen ---

    [Fact]
    public async Task IsAvailableAsync_CallsSettingsServiceLoad()
    {
        var sut = CreateClient(HttpStatusCode.OK, "{}");

        await sut.IsAvailableAsync();

        _settingsService.Received(1).Load();
    }

    [Fact]
    public async Task GetModelsAsync_CallsSettingsServiceLoad()
    {
        var sut = CreateClient(HttpStatusCode.OK, """{"data":[]}""");

        await sut.GetModelsAsync();

        _settingsService.Received(1).Load();
    }

    [Fact]
    public async Task GenerateAsync_CallsSettingsServiceLoad()
    {
        var sut = CreateClient(HttpStatusCode.OK, "data: [DONE]\n\n");

        await CollectTokensAsync(sut);

        _settingsService.Received(1).Load();
    }

    [Fact]
    public async Task CompleteWithToolsAsync_CallsSettingsServiceLoad()
    {
        var json = """{"choices":[{"finish_reason":"stop","message":{"content":"ok"}}]}""";
        var sut = CreateClient(HttpStatusCode.OK, json);

        await sut.CompleteWithToolsAsync([], [], CancellationToken.None);

        _settingsService.Received(1).Load();
    }

    // --- Helper ---

    private OllamaClient CreateClient(HttpStatusCode statusCode, string body)
    {
        var handler = new FakeHttpMessageHandler(statusCode, body);
        return new OllamaClient(_settingsService, NullLogger<OllamaClient>.Instance, new HttpClient(handler));
    }

    private static async Task<List<string>> CollectTokensAsync(OllamaClient client)
    {
        var tokens = new List<string>();
        await foreach (var token in client.GenerateAsync([], CancellationToken.None))
            tokens.Add(token);
        return tokens;
    }

    private static string BuildSseStream(params string[] jsonChunks)
    {
        var sb = new StringBuilder();
        foreach (var chunk in jsonChunks)
            sb.Append($"data: {chunk}\n\n");
        sb.Append("data: [DONE]\n\n");
        return sb.ToString();
    }

    private sealed class FakeHttpMessageHandler(HttpStatusCode statusCode, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
            return Task.FromResult(response);
        }
    }

    private sealed class ThrowingHttpMessageHandler(Exception exception) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
            => throw exception;
    }
}
