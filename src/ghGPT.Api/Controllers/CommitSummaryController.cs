using ghGPT.Ai.Abstractions;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/ai")]
public class CommitSummaryController(ICommitSummaryService commitSummaryService) : ControllerBase
{
    [HttpPost("summarize-history")]
    public async Task StreamSummary(string id, [FromQuery] int count = 10, CancellationToken cancellationToken = default)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        await Response.Body.FlushAsync(cancellationToken);

        try
        {
            await foreach (var token in commitSummaryService.StreamSummaryAsync(id, count, cancellationToken))
            {
                var bytes = Encoding.UTF8.GetBytes($"data: {JsonSerializer.Serialize(token)}\n\n");
                await Response.Body.WriteAsync(bytes, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }

            var done = Encoding.UTF8.GetBytes($"event: done\ndata: \"\"\n\n");
            await Response.Body.WriteAsync(done, cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected
        }
        catch (Exception ex)
        {
            var error = Encoding.UTF8.GetBytes($"event: error\ndata: {JsonSerializer.Serialize(ex.Message)}\n\n");
            await Response.Body.WriteAsync(error, cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}
