using ghGPT.Api.Hubs;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace ghGPT.Api.Endpoints;

public static class RepositoryEndpoints
{
    public static void MapRepositoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/repos").WithTags("Repositories");

        group.MapGet("/", (IRepositoryService service) =>
            Results.Ok(service.GetAll()));

        group.MapPost("/create", async (
            [FromBody] CreateRepoRequest request,
            IRepositoryService service) =>
        {
            try
            {
                var repo = await service.CreateAsync(request.LocalPath, request.Name);
                return Results.Created($"/api/repos/{repo.Id}", repo);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/import", async (
            [FromBody] ImportRepoRequest request,
            IRepositoryService service) =>
        {
            try
            {
                var repo = await service.ImportAsync(request.LocalPath);
                return Results.Created($"/api/repos/{repo.Id}", repo);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/clone", async (
            [FromBody] CloneRepoRequest request,
            IRepositoryService service,
            IHubContext<RepositoryHub> hub) =>
        {
            try
            {
                var progress = new Progress<string>(async message =>
                    await hub.Clients.All.SendAsync("clone-progress", message));

                var repo = await Task.Run(() => service.CloneAsync(request.RemoteUrl, request.LocalPath, progress));
                await hub.Clients.All.SendAsync("clone-progress", "✓ Abgeschlossen");
                return Results.Created($"/api/repos/{repo.Id}", repo);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}

public record CreateRepoRequest(string LocalPath, string Name);
public record ImportRepoRequest(string LocalPath);
public record CloneRepoRequest(string RemoteUrl, string LocalPath);
