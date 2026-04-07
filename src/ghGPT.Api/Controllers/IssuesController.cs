using ghGPT.Core.Issues;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/issues")]
public class IssuesController(
    IRepositoryService repositoryService,
    IIssueService issueService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IssueListItem>>> GetIssues(
        string id,
        [FromQuery] string state = "open")
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var issues = await issueService.GetIssuesAsync(ownerRepo.owner, ownerRepo.repo, state);
            return Ok(issues);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{number:int}")]
    public async Task<ActionResult<IssueDetail>> GetIssueDetail(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var detail = await issueService.GetIssueDetailAsync(ownerRepo.owner, ownerRepo.repo, number);
            return Ok(detail);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<IssueListItem>> CreateIssue(string id, [FromBody] CreateIssueRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var issue = await issueService.CreateAsync(
                ownerRepo.owner, ownerRepo.repo,
                request.Title, request.Body, request.Labels);
            return Ok(issue);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{number:int}/comments")]
    public async Task<IActionResult> AddComment(string id, int number, [FromBody] AddCommentRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            await issueService.AddCommentAsync(ownerRepo.owner, ownerRepo.repo, number, request.Body);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private bool TryResolveOwnerRepo(string repoId, out (string owner, string repo) result, out ActionResult? error)
    {
        result = default;
        var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == repoId);
        if (repo is null)
        {
            error = NotFound(new { error = "Repository nicht gefunden." });
            return false;
        }

        if (string.IsNullOrEmpty(repo.RemoteUrl))
        {
            error = BadRequest(new { error = "Dieses Repository hat keinen GitHub-Remote." });
            return false;
        }

        try
        {
            var parsed = RemoteUrlParser.Parse(repo.RemoteUrl);
            result = (parsed.Owner, parsed.Repo);
            error = null;
            return true;
        }
        catch (InvalidOperationException ex)
        {
            error = BadRequest(new { error = ex.Message });
            return false;
        }
    }
}

public record CreateIssueRequest(
    string Title,
    string Body,
    IEnumerable<string>? Labels = null);

public record AddCommentRequest(string Body);
