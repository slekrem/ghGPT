using ghGPT.Core.Ai;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController(IOllamaClient ollamaClient, IAiSettingsService settingsService) : ControllerBase
{
    [HttpGet("status")]
    public async Task<ActionResult<OllamaStatus>> GetStatus()
    {
        var settings = settingsService.Load();
        var online = await ollamaClient.IsAvailableAsync();

        return Ok(new OllamaStatus
        {
            Online = online,
            BaseUrl = settings.BaseUrl,
            Model = settings.Model
        });
    }

    [HttpGet("models")]
    public async Task<ActionResult<IReadOnlyList<OllamaModelInfo>>> GetModels()
    {
        try
        {
            var models = await ollamaClient.GetModelsAsync();
            return Ok(models);
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, "Ollama ist nicht erreichbar.");
        }
    }

    [HttpPut("settings")]
    public IActionResult SaveSettings([FromBody] OllamaSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.BaseUrl) || string.IsNullOrWhiteSpace(settings.Model))
            return BadRequest("BaseUrl und Model dürfen nicht leer sein.");

        settingsService.Save(settings);
        return NoContent();
    }
}
