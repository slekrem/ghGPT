using ghGPT.Api.Hubs;
using ghGPT.Api.Models;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/repos")]
public class RepositoriesController(IRepositoryService service, IHubContext<RepositoryHub> hub) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<RepositoryInfo>> GetAll() => Ok(service.GetAll());

    [HttpGet("active")]
    public ActionResult<RepositoryInfo> GetActive()
    {
        var repo = service.GetActive();
        return repo is not null ? Ok(repo) : NoContent();
    }

    [HttpPut("active/{id}")]
    public ActionResult SetActive(string id)
    {
        try
        {
            service.SetActive(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("create")]
    public async Task<ActionResult<RepositoryInfo>> Create([FromBody] CreateRepoRequest request)
    {
        try
        {
            var repo = await service.CreateAsync(request.LocalPath, request.Name);
            return CreatedAtAction(nameof(GetAll), new { id = repo.Id }, repo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("import")]
    public async Task<ActionResult<RepositoryInfo>> Import([FromBody] ImportRepoRequest request)
    {
        try
        {
            var repo = await service.ImportAsync(request.LocalPath);
            return CreatedAtAction(nameof(GetAll), new { id = repo.Id }, repo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("clone")]
    public async Task<ActionResult<RepositoryInfo>> Clone([FromBody] CloneRepoRequest request)
    {
        try
        {
            var progress = new Progress<string>(async message =>
                await hub.Clients.All.SendAsync("clone-progress", message));

            var repo = await Task.Run(() => service.CloneAsync(request.RemoteUrl, request.LocalPath, progress));
            await hub.Clients.All.SendAsync("clone-progress", "✓ Abgeschlossen");
            return CreatedAtAction(nameof(GetAll), new { id = repo.Id }, repo);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
