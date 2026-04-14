using ghGPT.Core.Issues;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/issues")]
public class IssuesController(
    IRepositoryService repositoryService,
    IIssueService issueService) : GitHubControllerBase(repositoryService)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IssueListItem>>> GetIssues(
        string id,
        [FromQuery] string state = "open")
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var issues = await issueService.GetIssuesAsync(ownerRepo.owner, ownerRepo.repo, state);
        return Ok(issues);
    }

    [HttpGet("{number:int}")]
    public async Task<ActionResult<IssueDetail>> GetIssueDetail(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var detail = await issueService.GetIssueDetailAsync(ownerRepo.owner, ownerRepo.repo, number);
        return Ok(detail);
    }

    [HttpPost]
    public async Task<ActionResult<IssueListItem>> CreateIssue(string id, [FromBody] CreateIssueRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var issue = await issueService.CreateAsync(
            ownerRepo.owner, ownerRepo.repo,
            request.Title, request.Body, request.Labels);
        return Ok(issue);
    }

    [HttpPost("{number:int}/comments")]
    public async Task<IActionResult> AddComment(string id, int number, [FromBody] AddCommentRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await issueService.AddCommentAsync(ownerRepo.owner, ownerRepo.repo, number, request.Body);
        return NoContent();
    }
}

public record CreateIssueRequest(
    string Title,
    string Body,
    IEnumerable<string>? Labels = null);

public record AddCommentRequest(string Body);
