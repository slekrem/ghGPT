using ghGPT.Core.PullRequests;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.PullRequests;
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
        var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == id);
        if (repo is null)
            return NotFound(new { error = "Repository nicht gefunden." });

        if (string.IsNullOrEmpty(repo.RemoteUrl))
            return BadRequest(new { error = "Dieses Repository hat keinen GitHub-Remote." });

        (string owner, string repoName) ownerRepo;
        try
        {
            ownerRepo = PullRequestService.ParseRemoteUrl(repo.RemoteUrl);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        try
        {
            var prs = await pullRequestService.GetPullRequestsAsync(ownerRepo.owner, ownerRepo.repoName, state);
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
        var repo = repositoryService.GetAll().FirstOrDefault(r => r.Id == id);
        if (repo is null)
            return NotFound(new { error = "Repository nicht gefunden." });

        if (string.IsNullOrEmpty(repo.RemoteUrl))
            return BadRequest(new { error = "Dieses Repository hat keinen GitHub-Remote." });

        (string owner, string repoName) ownerRepo;
        try
        {
            ownerRepo = PullRequestService.ParseRemoteUrl(repo.RemoteUrl);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        try
        {
            var detail = await pullRequestService.GetPullRequestDetailAsync(ownerRepo.owner, ownerRepo.repoName, number);
            return Ok(detail);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
