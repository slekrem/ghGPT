using ghGPT.Core.Repositories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Ai.Tests;

public class DiffServiceTests
{
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly DiffService _sut;

    public DiffServiceTests()
    {
        _sut = new DiffService(_repositoryService, NullLogger<DiffService>.Instance);
    }

    // --- BuildStagedDiff ---

    [Fact]
    public void BuildStagedDiff_WithStagedFiles_ReturnsDiff()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "Foo.cs", Status = "Modified", IsStaged = true }],
            Unstaged = []
        });
        _repositoryService.GetDiff("repo-1", "Foo.cs", staged: true).Returns("+ added line");

        var result = _sut.BuildStagedDiff("repo-1");

        Assert.Contains("Foo.cs", result);
        Assert.Contains("+ added line", result);
    }

    [Fact]
    public void BuildStagedDiff_WhenNoStagedFiles_ReturnsEmpty()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [],
            Unstaged = [new FileStatusEntry { FilePath = "Bar.cs", Status = "Modified", IsStaged = false }]
        });

        var result = _sut.BuildStagedDiff("repo-1");

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void BuildStagedDiff_WhenDiffThrows_SkipsFileAndContinues()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged =
            [
                new FileStatusEntry { FilePath = "Bad.cs", Status = "Modified", IsStaged = true },
                new FileStatusEntry { FilePath = "Good.cs", Status = "Added", IsStaged = true }
            ],
            Unstaged = []
        });
        _repositoryService.GetDiff("repo-1", "Bad.cs", staged: true).Throws(new Exception("read error"));
        _repositoryService.GetDiff("repo-1", "Good.cs", staged: true).Returns("+ new file");

        var result = _sut.BuildStagedDiff("repo-1");

        Assert.DoesNotContain("Bad.cs", result);
        Assert.Contains("Good.cs", result);
        Assert.Contains("+ new file", result);
    }

    [Fact]
    public void BuildStagedDiff_WhenGetStatusThrows_ReturnsEmpty()
    {
        _repositoryService.GetStatus("repo-1").Throws(new Exception("git error"));

        var result = _sut.BuildStagedDiff("repo-1");

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void BuildStagedDiff_SkipsFilesWithEmptyDiff()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "Empty.cs", Status = "Modified", IsStaged = true }],
            Unstaged = []
        });
        _repositoryService.GetDiff("repo-1", "Empty.cs", staged: true).Returns(string.Empty);

        var result = _sut.BuildStagedDiff("repo-1");

        Assert.Equal(string.Empty, result);
    }

    // --- BuildCombinedDiff ---

    [Fact]
    public void BuildCombinedDiff_WithStagedAndUnstagedFiles_ReturnsDiff()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "A.cs", Status = "Modified", IsStaged = true }],
            Unstaged = [new FileStatusEntry { FilePath = "B.cs", Status = "Modified", IsStaged = false }]
        });
        _repositoryService.GetCombinedDiff("repo-1", "A.cs").Returns("+ a");
        _repositoryService.GetCombinedDiff("repo-1", "B.cs").Returns("+ b");

        var result = _sut.BuildCombinedDiff("repo-1");

        Assert.Contains("A.cs", result);
        Assert.Contains("B.cs", result);
    }

    [Fact]
    public void BuildCombinedDiff_DeduplicatesFilesAppearedInBoth()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "Shared.cs", Status = "Modified", IsStaged = true }],
            Unstaged = [new FileStatusEntry { FilePath = "Shared.cs", Status = "Modified", IsStaged = false }]
        });
        _repositoryService.GetCombinedDiff("repo-1", "Shared.cs").Returns("+ x");

        _sut.BuildCombinedDiff("repo-1");

        _repositoryService.Received(1).GetCombinedDiff("repo-1", "Shared.cs");
    }

    [Fact]
    public void BuildCombinedDiff_WhenNoFiles_ReturnsEmpty()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [],
            Unstaged = []
        });

        var result = _sut.BuildCombinedDiff("repo-1");

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void BuildCombinedDiff_WhenDiffThrows_SkipsFileAndContinues()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged =
            [
                new FileStatusEntry { FilePath = "Bad.cs", Status = "Modified", IsStaged = true },
                new FileStatusEntry { FilePath = "Good.cs", Status = "Modified", IsStaged = true }
            ],
            Unstaged = []
        });
        _repositoryService.GetCombinedDiff("repo-1", "Bad.cs").Throws(new Exception("io error"));
        _repositoryService.GetCombinedDiff("repo-1", "Good.cs").Returns("+ ok");

        var result = _sut.BuildCombinedDiff("repo-1");

        Assert.DoesNotContain("Bad.cs", result);
        Assert.Contains("Good.cs", result);
    }

    [Fact]
    public void BuildCombinedDiff_WhenGetStatusThrows_ReturnsEmpty()
    {
        _repositoryService.GetStatus("repo-1").Throws(new Exception("git error"));

        var result = _sut.BuildCombinedDiff("repo-1");

        Assert.Equal(string.Empty, result);
    }
}
