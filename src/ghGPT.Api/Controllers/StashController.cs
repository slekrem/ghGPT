using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

public record PushStashRequest(string? Message, string[]? Paths);

[ApiController]
[Route("api/repos/{id}/stash")]
public class StashController(IStashService stashService) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<StashEntry>> GetStashes(string id)
    {
        try
        {
            return Ok(stashService.GetStashes(id));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost]
    public ActionResult PushStash(string id, [FromBody] PushStashRequest? request = null)
    {
        try
        {
            stashService.PushStash(id, request?.Message, request?.Paths);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{index}/diff")]
    public ActionResult<IReadOnlyList<CommitFileChange>> GetStashDiff(string id, int index)
    {
        try
        {
            return Ok(stashService.GetStashDiff(id, index));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("{index}/pop")]
    public ActionResult PopStash(string id, int index)
    {
        try
        {
            stashService.PopStash(id, index);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{index}")]
    public ActionResult DropStash(string id, int index)
    {
        try
        {
            stashService.DropStash(id, index);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
