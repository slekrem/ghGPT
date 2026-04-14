using ghGPT.Core.Releases;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/releases")]
public class ReleasesController(
    IRepositoryService repositoryService,
    IReleaseService releaseService) : GitHubControllerBase(repositoryService)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ReleaseListItem>>> GetReleases(string id, [FromQuery] int limit = 30)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var releases = await releaseService.GetReleasesAsync(ownerRepo.owner, ownerRepo.repo, limit);
        return Ok(releases);
    }

    [HttpGet("latest")]
    public async Task<ActionResult<ReleaseDetail>> GetLatest(string id)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var release = await releaseService.GetLatestAsync(ownerRepo.owner, ownerRepo.repo);
        return Ok(release);
    }

    [HttpGet("{tag}")]
    public async Task<ActionResult<ReleaseDetail>> GetByTag(string id, string tag)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        var release = await releaseService.GetByTagAsync(ownerRepo.owner, ownerRepo.repo, tag);
        return Ok(release);
    }
}
