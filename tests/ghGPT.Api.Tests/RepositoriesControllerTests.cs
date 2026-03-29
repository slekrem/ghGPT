using ghGPT.Api.Controllers;
using ghGPT.Api.Hubs;
using ghGPT.Api.Models;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Api.Tests;

public class RepositoriesControllerTests
{
    private readonly IRepositoryService _service = Substitute.For<IRepositoryService>();
    private readonly IHubContext<RepositoryHub> _hub = Substitute.For<IHubContext<RepositoryHub>>();
    private readonly RepositoriesController _controller;

    public RepositoriesControllerTests()
    {
        var clients = Substitute.For<IHubClients>();
        var clientProxy = Substitute.For<IClientProxy>();
        _hub.Clients.Returns(clients);
        clients.All.Returns(clientProxy);
        _controller = new RepositoriesController(_service, _hub);
    }

    private static RepositoryInfo MakeRepo(string id = "id-1") =>
        new() { Id = id, Name = "repo", LocalPath = "/x", CurrentBranch = "main" };

    // --- GetAll ---

    [Fact]
    public void GetAll_ReturnsOkWithRepos()
    {
        _service.GetAll().Returns([MakeRepo()]);

        var result = _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var repos = Assert.IsAssignableFrom<IReadOnlyList<RepositoryInfo>>(ok.Value);
        Assert.Single(repos);
    }

    // --- GetActive ---

    [Fact]
    public void GetActive_ReturnsOkWhenRepoExists()
    {
        _service.GetActive().Returns(MakeRepo());

        var result = _controller.GetActive();

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public void GetActive_ReturnsNoContentWhenNoneActive()
    {
        _service.GetActive().Returns((RepositoryInfo?)null);

        var result = _controller.GetActive();

        Assert.IsType<NoContentResult>(result.Result);
    }

    // --- SetActive ---

    [Fact]
    public void SetActive_ReturnsNoContentOnSuccess()
    {
        var result = _controller.SetActive("id-1");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).SetActive("id-1");
    }

    [Fact]
    public void SetActive_ReturnsNotFoundForUnknownId()
    {
        _service.When(s => s.SetActive("unknown")).Throw(new InvalidOperationException("not found"));

        var result = _controller.SetActive("unknown");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // --- Create ---

    [Fact]
    public async Task Create_ReturnsCreatedWithRepo()
    {
        var repo = MakeRepo();
        _service.CreateAsync("/path", "repo").Returns(repo);

        var result = await _controller.Create(new CreateRepoRequest { LocalPath = "/path", Name = "repo" });

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequestOnError()
    {
        _service.CreateAsync(Arg.Any<string>(), Arg.Any<string>())
            .Throws(new InvalidOperationException("exists"));

        var result = await _controller.Create(new CreateRepoRequest { LocalPath = "/path", Name = "repo" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // --- Import ---

    [Fact]
    public async Task Import_ReturnsCreatedWithRepo()
    {
        var repo = MakeRepo();
        _service.ImportAsync("/path").Returns(repo);

        var result = await _controller.Import(new ImportRepoRequest { LocalPath = "/path" });

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }

    [Fact]
    public async Task Import_ReturnsBadRequestOnError()
    {
        _service.ImportAsync(Arg.Any<string>())
            .Throws(new InvalidOperationException("invalid"));

        var result = await _controller.Import(new ImportRepoRequest { LocalPath = "/bad" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // --- Remove ---

    [Fact]
    public void Remove_ReturnsNoContentOnSuccess()
    {
        var result = _controller.Remove("id-1");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).Remove("id-1");
    }

    [Fact]
    public void Remove_ReturnsNotFoundForUnknownId()
    {
        _service.When(s => s.Remove("bad")).Throw(new InvalidOperationException("not found"));

        var result = _controller.Remove("bad");

        Assert.IsType<NotFoundObjectResult>(result);
    }
}
