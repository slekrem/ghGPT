using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}")]
public class ChangesController(IRepositoryService service) : ControllerBase
{
    [HttpGet("status")]
    public ActionResult<RepositoryStatusResult> GetStatus(string id)
    {
        try
        {
            return Ok(service.GetStatus(id));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("diff")]
    public ActionResult<string> GetDiff(string id, [FromQuery] string file, [FromQuery] bool staged = false)
    {
        try
        {
            var diff = service.GetDiff(id, file, staged);
            return Ok(diff);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("stage")]
    public ActionResult StageFile(string id, [FromQuery] string file)
    {
        try
        {
            service.StageFile(id, file);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("unstage")]
    public ActionResult UnstageFile(string id, [FromQuery] string file)
    {
        try
        {
            service.UnstageFile(id, file);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("stage-all")]
    public ActionResult StageAll(string id)
    {
        try
        {
            service.StageAll(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("unstage-all")]
    public ActionResult UnstageAll(string id)
    {
        try
        {
            service.UnstageAll(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
