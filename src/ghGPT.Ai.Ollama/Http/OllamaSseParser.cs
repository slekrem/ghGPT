using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ghGPT.Ai.Ollama;

internal static class OllamaSseParser
{
    public static async IAsyncEnumerable<string> ParseTokensAsync(
        Stream stream,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrEmpty(line) || !line.StartsWith("data: ")) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            var chunk = JsonSerializer.Deserialize<OpenAiChunk>(data);
            var token = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(token))
                yield return token;
        }
    }
}
