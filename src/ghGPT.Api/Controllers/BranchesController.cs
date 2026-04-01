using ghGPT.Api.Models;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/branches")]
public class BranchesController(IRepositoryService service) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<BranchInfo>> GetBranches(string id)
    {
        try
        {
            return Ok(service.GetBranches(id));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPut("checkout")]
    public ActionResult Checkout(string id, [FromBody] CheckoutBranchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Branch-Name darf nicht leer sein." });

        try
        {
            service.CheckoutBranch(id, request.Name);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public ActionResult<BranchInfo> CreateBranch(string id, [FromBody] CreateBranchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Branch-Name darf nicht leer sein." });

        try
        {
            var branch = service.CreateBranch(id, request.Name, request.StartPoint);
            return Created(string.Empty, branch);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{name}")]
    public async Task<ActionResult> DeleteBranch(string id, string name)
    {
        try
        {
            await service.DeleteBranch(id, name);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
