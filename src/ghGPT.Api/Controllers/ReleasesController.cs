using ghGPT.Core.Releases;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos/{id}/releases")]
public class ReleasesController(
    IRepositoryService repositoryService,
    IReleaseService releaseService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ReleaseListItem>>> GetReleases(string id, [FromQuery] int limit = 30)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var releases = await releaseService.GetReleasesAsync(ownerRepo.owner, ownerRepo.repo, limit);
            return Ok(releases);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("latest")]
    public async Task<ActionResult<ReleaseDetail>> GetLatest(string id)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var release = await releaseService.GetLatestAsync(ownerRepo.owner, ownerRepo.repo);
            return Ok(release);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{tag}")]
    public async Task<ActionResult<ReleaseDetail>> GetByTag(string id, string tag)
    {
        if (!TryResolveOwnerRepo(id, out var ownerRepo, out var error))
            return error!;

        try
        {
            var release = await releaseService.GetByTagAsync(ownerRepo.owner, ownerRepo.repo, tag);
            return Ok(release);
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
