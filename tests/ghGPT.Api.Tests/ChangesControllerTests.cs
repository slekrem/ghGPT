using ghGPT.Api.Controllers;
using ghGPT.Api.Models;
using ghGPT.Core.Repositories;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Api.Tests;

public class ChangesControllerTests
{
    private readonly IRepositoryService _service = Substitute.For<IRepositoryService>();
    private readonly ChangesController _controller;

    public ChangesControllerTests()
    {
        _controller = new ChangesController(_service);
    }

    // --- GetStatus ---

    [Fact]
    public void GetStatus_ReturnsOkWithResult()
    {
        var status = new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "README.md", Status = "Modified", IsStaged = true }],
            Unstaged = []
        };
        _service.GetStatus("id-1").Returns(status);

        var result = _controller.GetStatus("id-1");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<RepositoryStatusResult>(ok.Value);
    }

    [Fact]
    public void GetStatus_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.GetStatus("bad")).Throw(new InvalidOperationException("not found"));

        var result = _controller.GetStatus("bad");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public void GetHistory_ReturnsOkWithCommits()
    {
        _service.GetHistory("id-1", 50).Returns([
            new CommitHistoryEntry { Sha = "abcdef123456", ShortSha = "abcdef1", Message = "feat: test" }
        ]);

        var result = _controller.GetHistory("id-1");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsAssignableFrom<IReadOnlyList<CommitHistoryEntry>>(ok.Value);
        Assert.Single(history);
    }

    [Fact]
    public void GetHistory_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.GetHistory("bad", Arg.Any<int>())).Throw(new InvalidOperationException("not found"));

        var result = _controller.GetHistory("bad");

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    // --- GetDiff ---

    [Fact]
    public void GetDiff_ReturnsOkWithDiffString()
    {
        _service.GetDiff("id-1", "README.md", false).Returns("@@ -1 +1 @@\n-old\n+new");

        var result = _controller.GetDiff("id-1", "README.md", false);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<string>(ok.Value);
    }

    [Fact]
    public void GetDiff_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.GetDiff("bad", Arg.Any<string>(), Arg.Any<bool>()))
            .Throw(new InvalidOperationException("not found"));

        var result = _controller.GetDiff("bad", "file.txt", false);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    // --- StageFile ---

    [Fact]
    public void StageFile_ReturnsNoContent()
    {
        var result = _controller.StageFile("id-1", "README.md");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).StageFile("id-1", "README.md");
    }

    [Fact]
    public void StageFile_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.StageFile("bad", Arg.Any<string>()))
            .Throw(new InvalidOperationException("not found"));

        var result = _controller.StageFile("bad", "file.txt");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // --- UnstageFile ---

    [Fact]
    public void UnstageFile_ReturnsNoContent()
    {
        var result = _controller.UnstageFile("id-1", "README.md");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).UnstageFile("id-1", "README.md");
    }

    [Fact]
    public void UnstageFile_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.UnstageFile("bad", Arg.Any<string>()))
            .Throw(new InvalidOperationException("not found"));

        var result = _controller.UnstageFile("bad", "file.txt");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // --- StageAll ---

    [Fact]
    public void StageAll_ReturnsNoContent()
    {
        var result = _controller.StageAll("id-1");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).StageAll("id-1");
    }

    [Fact]
    public void StageAll_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.StageAll("bad")).Throw(new InvalidOperationException("not found"));

        var result = _controller.StageAll("bad");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // --- UnstageAll ---

    [Fact]
    public void UnstageAll_ReturnsNoContent()
    {
        var result = _controller.UnstageAll("id-1");

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).UnstageAll("id-1");
    }

    [Fact]
    public void UnstageAll_ReturnsNotFoundForUnknownRepo()
    {
        _service.When(s => s.UnstageAll("bad")).Throw(new InvalidOperationException("not found"));

        var result = _controller.UnstageAll("bad");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // --- Commit ---

    [Fact]
    public void Commit_ReturnsNoContentOnSuccess()
    {
        var result = _controller.Commit("id-1", new CommitRequest { Message = "feat: test" });

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).Commit("id-1", "feat: test", null);
    }

    [Fact]
    public void Commit_ReturnsBadRequestWhenMessageEmpty()
    {
        var result = _controller.Commit("id-1", new CommitRequest { Message = "" });

        Assert.IsType<BadRequestObjectResult>(result);
        _service.DidNotReceive().Commit(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    [Fact]
    public void Commit_ReturnsBadRequestWhenNothingStaged()
    {
        _service.When(s => s.Commit("id-1", Arg.Any<string>(), Arg.Any<string?>()))
            .Throw(new InvalidOperationException("Keine gestagten Änderungen vorhanden."));

        var result = _controller.Commit("id-1", new CommitRequest { Message = "feat: test" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Commit_PassesDescriptionToService()
    {
        _controller.Commit("id-1", new CommitRequest { Message = "feat: title", Description = "body text" });

        _service.Received(1).Commit("id-1", "feat: title", "body text");
    }
}
