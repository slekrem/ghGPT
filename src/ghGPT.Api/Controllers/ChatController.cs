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
            await foreach (var chatEvent in chatService.StreamAsync(request, cancellationToken))
            {
                switch (chatEvent)
                {
                    case TokenEvent tokenEvent:
                        var data = JsonSerializer.Serialize(tokenEvent.Token);
                        var line = $"data: {data}\n\n";
                        await WriteRaw(line, cancellationToken);
                        break;

                    case ToolExecutedEvent toolEvent:
                        var toolData = JsonSerializer.Serialize(new
                        {
                            toolName = toolEvent.ToolName,
                            displayArgs = toolEvent.DisplayArgs,
                            success = toolEvent.Success,
                            message = toolEvent.Message
                        });
                        await WriteRaw($"event: tool\ndata: {toolData}\n\n", cancellationToken);
                        break;
                }
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

    private async Task WriteRaw(string text, CancellationToken cancellationToken)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        await Response.Body.WriteAsync(bytes, cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    private async Task WriteEvent(string eventType, string data, CancellationToken cancellationToken)
    {
        var line = $"event: {eventType}\ndata: {JsonSerializer.Serialize(data)}\n\n";
        await WriteRaw(line, cancellationToken);
    }
}
