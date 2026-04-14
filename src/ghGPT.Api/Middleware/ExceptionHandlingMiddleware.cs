using System.Net;
using System.Text.Json;

namespace ghGPT.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InvalidOperationException ex)
        {
            await WriteErrorAsync(context, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Externe HTTP-Anfrage fehlgeschlagen.");
            await WriteErrorAsync(context, HttpStatusCode.ServiceUnavailable, "Externer Dienst ist nicht erreichbar.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unbehandelter Fehler.");
            await WriteErrorAsync(context, HttpStatusCode.InternalServerError, "Ein unerwarteter Fehler ist aufgetreten.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, HttpStatusCode statusCode, string message)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        var body = JsonSerializer.Serialize(new { error = message });
        await context.Response.WriteAsync(body);
    }
}
