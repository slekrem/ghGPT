using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/pull-requests")]
public class PullRequestsController(
    IRepositoryService repositoryService,
    IPullRequestService pullRequestService) : GitHubControllerBase(repositoryService)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PullRequestListItem>>> GetPullRequests(
        string id,
        [FromQuery] string state = "open")
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var prs = await pullRequestService.GetPullRequestsAsync(ownerRepo.owner, ownerRepo.repo, state);
        return Ok(prs);
    }

    [HttpGet("{number:int}")]
    public async Task<ActionResult<PullRequestDetail>> GetPullRequestDetail(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var detail = await pullRequestService.GetPullRequestDetailAsync(ownerRepo.owner, ownerRepo.repo, number);
        return Ok(detail);
    }

    [HttpPost]
    public async Task<ActionResult<PullRequestDetail>> CreatePullRequest(string id, [FromBody] CreatePullRequestRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var detail = await pullRequestService.CreateAsync(
            ownerRepo.owner, ownerRepo.repo,
            request.Title, request.Body,
            request.HeadBranch, request.BaseBranch,
            request.Draft);
        return Ok(detail);
    }

    [HttpPatch("{number:int}")]
    public async Task<IActionResult> EditPullRequest(string id, int number, [FromBody] EditPullRequestRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await pullRequestService.EditAsync(ownerRepo.owner, ownerRepo.repo, number, request.Title, request.Body);
        return NoContent();
    }

    [HttpPatch("{number:int}/close")]
    public async Task<IActionResult> ClosePullRequest(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await pullRequestService.CloseAsync(ownerRepo.owner, ownerRepo.repo, number);
        return NoContent();
    }

    [HttpPatch("{number:int}/reopen")]
    public async Task<IActionResult> ReopenPullRequest(string id, int number)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await pullRequestService.ReopenAsync(ownerRepo.owner, ownerRepo.repo, number);
        return NoContent();
    }

    [HttpPost("{number:int}/reviews")]
    public async Task<IActionResult> CreateReview(string id, int number, [FromBody] CreateReviewRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await pullRequestService.CreateReviewAsync(ownerRepo.owner, ownerRepo.repo, number, request.Event, request.Body);
        return NoContent();
    }

    [HttpPost("{number:int}/comments")]
    public async Task<IActionResult> AddComment(string id, int number, [FromBody] AddCommentRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await pullRequestService.AddCommentAsync(ownerRepo.owner, ownerRepo.repo, number, request.Body);
        return NoContent();
    }

    [HttpPost("{number:int}/merge")]
    public async Task<IActionResult> MergePullRequest(string id, int number, [FromBody] MergePullRequestRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        await pullRequestService.MergeAsync(ownerRepo.owner, ownerRepo.repo, number, request.Method, request.CommitTitle, request.CommitBody);
        return NoContent();
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

public record CreateReviewRequest(
    string Event,
    string? Body = null);
