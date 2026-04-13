using ghGPT.Ai.Abstractions;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ghGPT.Ai.Ollama;

internal sealed class OllamaClient(
    IAiSettingsService settingsService,
    ILogger<OllamaClient> logger,
    HttpClient? httpClient = null) : IOllamaClient
{
    private readonly HttpClient _http = httpClient ?? new() { Timeout = TimeSpan.FromMinutes(10) };

    private static readonly JsonSerializerOptions JsonOptions = new()
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
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Ollama nicht erreichbar unter {BaseUrl}.", settings.BaseUrl);
            return false;
        }
    }

    public async Task<IReadOnlyList<AiModelInfo>> GetModelsAsync()
    {
        var settings = settingsService.Load();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/v1/models", cts.Token);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OpenAiModelsResponse>();
        return result?.Data?.Select(m => new AiModelInfo
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

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/v1/chat/completions")
        {
            Content = JsonContent.Create(requestBody)
        };

        using var response = await SendAsync(request, cancellationToken);
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

        await foreach (var token in OllamaSseParser.ParseTokensAsync(stream, cancellationToken))
            yield return token;
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

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/v1/chat/completions")
        {
            Content = JsonContent.Create(requestBody)
        };

        using var response = await SendAsync(request, cancellationToken);

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

    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
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
}
