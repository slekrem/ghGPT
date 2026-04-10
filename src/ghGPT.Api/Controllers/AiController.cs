using ghGPT.Ai.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController(
    IAiProviderService providerService,
    IAiSettingsService settingsService,
    IChatHistoryService historyService) : ControllerBase
{
    [HttpGet("status")]
    public async Task<ActionResult<AiStatus>> GetStatus()
    {
        var status = await providerService.GetStatusAsync();
        return Ok(status);
    }

    [HttpGet("models")]
    public async Task<ActionResult<IReadOnlyList<AiModelInfo>>> GetModels()
    {
        try
        {
            var models = await providerService.GetModelsAsync();
            return Ok(models);
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, "AI-Provider ist nicht erreichbar.");
        }
    }

    [HttpPut("settings")]
    public IActionResult SaveSettings([FromBody] AiSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.BaseUrl) || string.IsNullOrWhiteSpace(settings.Model))
            return BadRequest("BaseUrl und Model dürfen nicht leer sein.");

        settingsService.Save(settings);
        return NoContent();
    }

    [HttpGet("history/{repoId}")]
    public ActionResult<IReadOnlyList<ChatHistoryEntry>> GetHistory(string repoId)
    {
        var history = historyService.Load(repoId);
        return Ok(history);
    }

    [HttpDelete("history/{repoId}")]
    public IActionResult ClearHistory(string repoId)
    {
        historyService.Clear(repoId);
        return NoContent();
    }
}
