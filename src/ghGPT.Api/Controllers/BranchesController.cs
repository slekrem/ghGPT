using ghGPT.Api.Models;
using ghGPT.Core.Issues;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/branches")]
public class BranchesController(IRepositoryService service, IBranchService branchService, IIssueService issueService) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<BranchInfo>> GetBranches(string id)
    {
        try
        {
            return Ok(branchService.GetBranches(id));
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
            branchService.CheckoutBranch(id, request.Name, request.Strategy, request.StashMessage);
            return NoContent();
        }
        catch (UncommittedChangesException)
        {
            return Conflict(new { error = "Uncommitted changes vorhanden." });
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
            var branch = branchService.CreateBranch(id, request.Name, request.StartPoint);
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
            await branchService.DeleteBranch(id, Uri.UnescapeDataString(name));
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("linked-issue")]
    public async Task<ActionResult<IssueDetail>> GetLinkedIssue(string id)
    {
        var repo = service.GetAll().FirstOrDefault(r => r.Id == id);
        if (repo is null)
            return NotFound(new { error = "Repository nicht gefunden." });

        if (string.IsNullOrEmpty(repo.RemoteUrl))
            return BadRequest(new { error = "Dieses Repository hat keinen GitHub-Remote." });

        try
        {
            var parsed = RemoteUrlParser.Parse(repo.RemoteUrl);
            var issue = await issueService.GetLinkedIssueForBranchAsync(parsed.Owner, parsed.Repo, repo.CurrentBranch);
            if (issue is null)
                return NotFound();
            return Ok(issue);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
