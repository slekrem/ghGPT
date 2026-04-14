using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

public abstract class GitHubControllerBase(IRepositoryService repositoryService) : ControllerBase
{
    protected bool TryResolveOwnerRepo(string repoId, out (string owner, string repo) result, out ActionResult? error)
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
