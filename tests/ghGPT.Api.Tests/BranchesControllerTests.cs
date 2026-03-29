using ghGPT.Api.Controllers;
using ghGPT.Api.Models;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Api.Tests;

public class BranchesControllerTests
{
    private readonly IRepositoryService _service = Substitute.For<IRepositoryService>();
    private readonly BranchesController _controller;

    public BranchesControllerTests()
    {
        _controller = new BranchesController(_service);
    }

    // --- GetBranches ---

    [Fact]
    public void GetBranches_ReturnsOkWithBranchList()
    {
        _service.GetBranches("id-1").Returns([
            new BranchInfo { Name = "main", IsHead = true, IsRemote = false },
            new BranchInfo { Name = "feature/x", IsHead = false, IsRemote = false },
            new BranchInfo { Name = "origin/main", IsHead = false, IsRemote = true },
        ]);

        var result = _controller.GetBranches("id-1");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IReadOnlyList<BranchInfo>>(ok.Value);
        Assert.Equal(3, list.Count);
    }

    [Fact]
    public void GetBranches_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.GetBranches("bad")).Throw(new InvalidOperationException("not found"));

        var result = _controller.GetBranches("bad");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    // --- Checkout ---

    [Fact]
    public void Checkout_ReturnsNoContentOnSuccess()
    {
        var result = _controller.Checkout("id-1", new CheckoutBranchRequest { Name = "feature/x" });

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).CheckoutBranch("id-1", "feature/x");
    }

    [Fact]
    public void Checkout_ReturnsBadRequestWhenNameEmpty()
    {
        var result = _controller.Checkout("id-1", new CheckoutBranchRequest { Name = "" });

        Assert.IsType<BadRequestObjectResult>(result);
        _service.DidNotReceive().CheckoutBranch(Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public void Checkout_ReturnsBadRequestWhenDirtyWorkingTree()
    {
        _service.When(s => s.CheckoutBranch("id-1", "feature/x"))
            .Throw(new InvalidOperationException("Uncommitted changes vorhanden."));

        var result = _controller.Checkout("id-1", new CheckoutBranchRequest { Name = "feature/x" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Checkout_ReturnsBadRequestForUnknownBranch()
    {
        _service.When(s => s.CheckoutBranch("id-1", "ghost"))
            .Throw(new InvalidOperationException("Branch 'ghost' nicht gefunden."));

        var result = _controller.Checkout("id-1", new CheckoutBranchRequest { Name = "ghost" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    // --- CreateBranch ---

    [Fact]
    public void CreateBranch_ReturnsCreatedWithBranchInfo()
    {
        _service.CreateBranch("id-1", "feature/new", null).Returns(
            new BranchInfo { Name = "feature/new", IsHead = true, IsRemote = false });

        var result = _controller.CreateBranch("id-1", new CreateBranchRequest { Name = "feature/new" });

        var created = Assert.IsType<CreatedResult>(result.Result);
        var branch = Assert.IsType<BranchInfo>(created.Value);
        Assert.Equal("feature/new", branch.Name);
        Assert.True(branch.IsHead);
    }

    [Fact]
    public void CreateBranch_PassesStartPointToService()
    {
        _service.CreateBranch("id-1", "feature/from-main", "main").Returns(
            new BranchInfo { Name = "feature/from-main", IsHead = true, IsRemote = false });

        _controller.CreateBranch("id-1", new CreateBranchRequest { Name = "feature/from-main", StartPoint = "main" });

        _service.Received(1).CreateBranch("id-1", "feature/from-main", "main");
    }

    [Fact]
    public void CreateBranch_ReturnsBadRequestWhenNameEmpty()
    {
        var result = _controller.CreateBranch("id-1", new CreateBranchRequest { Name = "" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _service.DidNotReceive().CreateBranch(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    [Fact]
    public void CreateBranch_ReturnsBadRequestForUnknownStartPoint()
    {
        _service.When(s => s.CreateBranch("id-1", "feature/new", "ghost"))
            .Throw(new InvalidOperationException("Start-Branch 'ghost' nicht gefunden."));

        var result = _controller.CreateBranch("id-1", new CreateBranchRequest { Name = "feature/new", StartPoint = "ghost" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // --- DeleteBranch ---

    [Fact]
    public void DeleteBranch_ReturnsNoContentOnSuccess()
    {
        var result = _controller.DeleteBranch("id-1", "feature/old");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).DeleteBranch("id-1", "feature/old");
    }

    [Fact]
    public void DeleteBranch_ReturnsBadRequestWhenDeletingActiveBranch()
    {
        _service.When(s => s.DeleteBranch("id-1", "main"))
            .Throw(new InvalidOperationException("Der aktive Branch kann nicht gelöscht werden."));

        var result = _controller.DeleteBranch("id-1", "main");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void DeleteBranch_ReturnsBadRequestForUnknownBranch()
    {
        _service.When(s => s.DeleteBranch("id-1", "ghost"))
            .Throw(new InvalidOperationException("Branch 'ghost' nicht gefunden."));

        var result = _controller.DeleteBranch("id-1", "ghost");

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
