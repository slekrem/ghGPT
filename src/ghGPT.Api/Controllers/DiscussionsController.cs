using ghGPT.Core.Discussions;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/discussions")]
public class DiscussionsController(
    IRepositoryService repositoryService,
    IDiscussionService discussionService) : GitHubControllerBase(repositoryService)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DiscussionItem>>> GetDiscussions(string id, [FromQuery] int limit = 30)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var discussions = await discussionService.GetDiscussionsAsync(ownerRepo.owner, ownerRepo.repo, limit);
            return Ok(discussions);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<DiscussionItem>> CreateDiscussion(string id, [FromBody] CreateDiscussionRequest request)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var discussion = await discussionService.CreateAsync(
                ownerRepo.owner, ownerRepo.repo,
                request.Title, request.Body, request.Category ?? "General");
            return Ok(discussion);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public record CreateDiscussionRequest(string Title, string Body, string? Category = null);
