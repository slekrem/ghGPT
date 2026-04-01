using ghGPT.Core.Ai;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/ai")]
public class ChatController(IChatService chatService) : ControllerBase
{
    [HttpPost("chat")]
    public async Task StreamChat([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        await Response.Body.FlushAsync(cancellationToken);

        try
        {
            await foreach (var token in chatService.StreamAsync(request, cancellationToken))
            {
                var data = JsonSerializer.Serialize(token);
                var line = $"data: {data}\n\n";
                var bytes = Encoding.UTF8.GetBytes(line);
                await Response.Body.WriteAsync(bytes, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }

            await WriteEvent("done", "", cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected
        }
        catch (Exception ex)
        {
            await WriteEvent("error", ex.Message, cancellationToken);
        }
    }

    private async Task WriteEvent(string eventType, string data, CancellationToken cancellationToken)
    {
        var line = $"event: {eventType}\ndata: {JsonSerializer.Serialize(data)}\n\n";
        var bytes = Encoding.UTF8.GetBytes(line);
        await Response.Body.WriteAsync(bytes, cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
