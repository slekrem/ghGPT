using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/pull-requests")]
public class PullRequestsController(
    IRepositoryService repositoryService,
    IPullRequestService pullRequestService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PullRequestListItem>>> GetPullRequests(
        string id,
        [FromQuery] string state = "open")
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var prs = await pullRequestService.GetPullRequestsAsync(ownerRepo.owner, ownerRepo.repo, state);
            return Ok(prs);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{number:int}")]
    public async Task<ActionResult<PullRequestDetail>> GetPullRequestDetail(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var detail = await pullRequestService.GetPullRequestDetailAsync(ownerRepo.owner, ownerRepo.repo, number);
            return Ok(detail);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<PullRequestDetail>> CreatePullRequest(string id, [FromBody] CreatePullRequestRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var detail = await pullRequestService.CreateAsync(
                ownerRepo.owner, ownerRepo.repo,
                request.Title, request.Body,
                request.HeadBranch, request.BaseBranch,
                request.Draft);
            return Ok(detail);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{number:int}")]
    public async Task<IActionResult> EditPullRequest(string id, int number, [FromBody] EditPullRequestRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            await pullRequestService.EditAsync(ownerRepo.owner, ownerRepo.repo, number, request.Title, request.Body);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{number:int}/close")]
    public async Task<IActionResult> ClosePullRequest(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            await pullRequestService.CloseAsync(ownerRepo.owner, ownerRepo.repo, number);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{number:int}/reopen")]
    public async Task<IActionResult> ReopenPullRequest(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            await pullRequestService.ReopenAsync(ownerRepo.owner, ownerRepo.repo, number);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{number:int}/merge")]
    public async Task<IActionResult> MergePullRequest(string id, int number, [FromBody] MergePullRequestRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            await pullRequestService.MergeAsync(ownerRepo.owner, ownerRepo.repo, number, request.Method, request.CommitTitle, request.CommitBody);
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

public record CreatePullRequestRequest(
    string Title,
    string Body,
    string HeadBranch,
    string BaseBranch,
    bool Draft = false);

public record EditPullRequestRequest(
    string? Title,
    string? Body);

public record MergePullRequestRequest(
    string Method = "merge",
    string? CommitTitle = null,
    string? CommitBody = null);
