using ghGPT.Api.Models;
using ghGPT.Core.Ai;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/ai")]
public class CommitMessageController(ICommitMessageService commitMessageService) : ControllerBase
{
    [HttpPost("commit-message")]
    public async Task StreamCommitMessage(string id, [FromBody] CommitMessageRequest? request, CancellationToken cancellationToken)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        await Response.Body.FlushAsync(cancellationToken);

        try
        {
            await foreach (var token in commitMessageService.StreamCommitMessageAsync(
                id,
                request?.LinkedIssueNumber,
                request?.LinkedIssueTitle,
                request?.LinkedIssueBody,
                cancellationToken))
            {
                var data = JsonSerializer.Serialize(token);
                var bytes = Encoding.UTF8.GetBytes($"data: {data}\n\n");
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
