using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/stash")]
public class StashController(IRepositoryService service) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<StashEntry>> GetStashes(string id)
    {
        try
        {
            return Ok(service.GetStashes(id));
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
            service.PopStash(id, index);
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
            service.DropStash(id, index);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
