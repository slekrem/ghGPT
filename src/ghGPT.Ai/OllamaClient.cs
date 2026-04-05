using ghGPT.Core.Ai;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ghGPT.Ai;

internal sealed class OllamaClient(IAiSettingsService settingsService, HttpClient? httpClient = null) : IOllamaClient
{
    private readonly HttpClient _http = httpClient ?? new() { Timeout = TimeSpan.FromMinutes(10) };

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<bool> IsAvailableAsync()
    {
        var settings = settingsService.Load();
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/v1/models", cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<IReadOnlyList<OllamaModelInfo>> GetModelsAsync()
    {
        var settings = settingsService.Load();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/v1/models", cts.Token);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OpenAiModelsResponse>();
        return result?.Data?.Select(m => new OllamaModelInfo
        {
            Name = m.Id,
            Size = 0,
            ModifiedAt = DateTimeOffset.FromUnixTimeSeconds(m.Created).UtcDateTime
        }).ToList() ?? [];
    }

    public async IAsyncEnumerable<string> GenerateAsync(
        IEnumerable<ChatMessage> messages,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var settings = settingsService.Load();

        var requestBody = new
        {
            model = settings.Model,
            messages = SerializeMessages(messages),
            stream = true
        };

        var content = JsonContent.Create(requestBody);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/v1/chat/completions")
        {
            Content = content
        };

        using var response = await SendStreamingAsync(request, cancellationToken);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new System.IO.StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrEmpty(line)) continue;
            if (!line.StartsWith("data: ")) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            var chunk = JsonSerializer.Deserialize<OpenAiChunk>(data);
            var token = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(token))
                yield return token;
        }
    }

    public async Task<ToolCallResponse> CompleteWithToolsAsync(
        IEnumerable<ChatMessage> messages,
        IEnumerable<ToolDefinition> tools,
        CancellationToken cancellationToken = default)
    {
        var settings = settingsService.Load();

        var requestBody = new
        {
            model = settings.Model,
            messages = SerializeMessages(messages),
            tools = tools.Select(t => new
            {
                type = t.Type,
                function = new
                {
                    name = t.Function.Name,
                    description = t.Function.Description,
                    parameters = t.Function.Parameters
                }
            }),
            stream = false
        };

        var content = JsonContent.Create(requestBody);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/v1/chat/completions")
        {
            Content = content
        };

        using var response = await SendStreamingAsync(request, cancellationToken);

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var completion = JsonSerializer.Deserialize<OpenAiCompletion>(json);

        var choice = completion?.Choices?.FirstOrDefault();
        if (choice is null)
            return new ToolCallResponse { Content = string.Empty };

        if (choice.FinishReason == "tool_calls" && choice.Message?.ToolCalls?.Count > 0)
        {
            var toolCalls = choice.Message.ToolCalls.Select(tc => new ToolCall
            {
                Id = tc.Id ?? string.Empty,
                Name = tc.Function?.Name ?? string.Empty,
                ArgumentsJson = tc.Function?.Arguments ?? "{}"
            }).ToList();

            return new ToolCallResponse { HasToolCalls = true, ToolCalls = toolCalls };
        }

        return new ToolCallResponse { Content = choice.Message?.Content ?? string.Empty };
    }

    private async Task<HttpResponseMessage> SendStreamingAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        return response;
    }

    private static IEnumerable<object> SerializeMessages(IEnumerable<ChatMessage> messages)
    {
        return messages.Select<ChatMessage, object>(m =>
        {
            if (m.ToolCalls is { Count: > 0 })
            {
                return new
                {
                    role = m.Role,
                    tool_calls = m.ToolCalls.Select(tc => new
                    {
                        id = tc.Id,
                        type = "function",
                        function = new { name = tc.Name, arguments = tc.ArgumentsJson }
                    })
                };
            }

            if (m.Role == "tool")
            {
                return new
                {
                    role = m.Role,
                    tool_call_id = m.ToolCallId,
                    content = m.Content ?? string.Empty
                };
            }

            return new { role = m.Role, content = m.Content ?? string.Empty };
        });
    }

    private sealed class OpenAiModelsResponse
    {
        [JsonPropertyName("data")]
        public List<OpenAiModel>? Data { get; set; }
    }

    private sealed class OpenAiModel
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("created")]
        public long Created { get; set; }
    }

    private sealed class OpenAiChunk
    {
        [JsonPropertyName("choices")]
        public List<OpenAiChoice>? Choices { get; set; }
    }

    private sealed class OpenAiChoice
    {
        [JsonPropertyName("delta")]
        public OpenAiDelta? Delta { get; set; }

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }

        [JsonPropertyName("message")]
        public OpenAiMessage? Message { get; set; }
    }

    private sealed class OpenAiDelta
    {
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }

    private sealed class OpenAiCompletion
    {
        [JsonPropertyName("choices")]
        public List<OpenAiCompletionChoice>? Choices { get; set; }
    }

    private sealed class OpenAiCompletionChoice
    {
        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }

        [JsonPropertyName("message")]
        public OpenAiMessage? Message { get; set; }
    }

    private sealed class OpenAiMessage
    {
        [JsonPropertyName("role")]
        public string? Role { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }

        [JsonPropertyName("tool_calls")]
        public List<OpenAiToolCall>? ToolCalls { get; set; }
    }

    private sealed class OpenAiToolCall
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("function")]
        public OpenAiToolCallFunction? Function { get; set; }
    }

    private sealed class OpenAiToolCallFunction
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("arguments")]
        public string? Arguments { get; set; }
    }
}
