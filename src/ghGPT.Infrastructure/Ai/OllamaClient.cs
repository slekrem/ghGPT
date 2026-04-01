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
            var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/api/tags");
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
        var response = await _http.GetAsync($"{settings.BaseUrl.TrimEnd('/')}/api/tags");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OllamaTagsResponse>();
        return result?.Models?.Select(m => new OllamaModelInfo
        {
            Name = m.Name,
            Size = m.Size,
            ModifiedAt = m.ModifiedAt
        }).ToList() ?? [];
    }

    public async IAsyncEnumerable<string> GenerateAsync(
        string prompt,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var settings = settingsService.Load();
        var requestBody = new { model = settings.Model, prompt, stream = true };
        var content = JsonContent.Create(requestBody);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/api/generate")
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

            var chunk = JsonSerializer.Deserialize<OllamaGenerateChunk>(line);
            if (chunk is null) continue;

            if (!string.IsNullOrEmpty(chunk.Response))
                yield return chunk.Response;

            if (chunk.Done) break;
        }
    }

    private sealed class OllamaTagsResponse
    {
        [JsonPropertyName("models")]
        public List<OllamaModelEntry>? Models { get; set; }
    }

    private sealed class OllamaModelEntry
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("size")]
        public long Size { get; set; }

        [JsonPropertyName("modified_at")]
        public DateTime ModifiedAt { get; set; }
    }

    private sealed class OllamaGenerateChunk
    {
        [JsonPropertyName("response")]
        public string Response { get; set; } = string.Empty;

        [JsonPropertyName("done")]
        public bool Done { get; set; }
    }
}
