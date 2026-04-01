using ghGPT.Core.Ai;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ghGPT.Infrastructure.Ai;

internal sealed class OllamaClient(IAiSettingsService settingsService) : IOllamaClient
{
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(3) };

    public async Task<bool> IsAvailableAsync()
    {
        var settings = settingsService.Load();
        try
        {
            var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/v1/models");
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
        var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/v1/models");
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
            messages = messages.Select(m => new { role = m.Role, content = m.Content }),
            stream = true
        };

        var content = JsonContent.Create(requestBody);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/v1/chat/completions")
        {
            Content = content
        };

        using var response = await new HttpClient { Timeout = TimeSpan.FromMinutes(5) }
            .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        response.EnsureSuccessStatusCode();

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
    }

    private sealed class OpenAiDelta
    {
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }
}
