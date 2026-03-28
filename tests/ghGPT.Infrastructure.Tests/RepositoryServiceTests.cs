using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using NSubstitute;

namespace ghGPT.Infrastructure.Tests;

public class RepositoryServiceTests : IDisposable
{
    private readonly string _tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    private readonly IRepositoryStore _store = Substitute.For<IRepositoryStore>();

    public RepositoryServiceTests()
    {
        _store.Load().Returns([]);
    }

    [Fact]
    public async Task CreateAsync_InitializesGitRepo()
    {
        var path = Path.Combine(_tempPath, "new-repo");
        var service = new RepositoryService(_store);

        var result = await service.CreateAsync(path, "new-repo");

        Assert.True(Directory.Exists(path));
        Assert.True(Directory.Exists(Path.Combine(path, ".git")));
        Assert.Equal("new-repo", result.Name);
        Assert.Equal(path, result.LocalPath);
        _store.Received(1).Save(Arg.Any<IReadOnlyList<RepositoryInfo>>());
    }

    [Fact]
    public async Task ImportAsync_ThrowsWhenNotAGitRepo()
    {
        var path = Path.Combine(_tempPath, "not-a-repo");
        Directory.CreateDirectory(path);
        var service = new RepositoryService(_store);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ImportAsync(path));
    }

    [Fact]
    public async Task ImportAsync_ThrowsWhenAlreadyImported()
    {
        var path = Path.Combine(_tempPath, "existing-repo");
        var existing = new RepositoryInfo { Id = "id-1", Name = "existing-repo", LocalPath = path, CurrentBranch = "main" };
        _store.Load().Returns([existing]);
        var service = new RepositoryService(_store);

        // create a real git repo so the valid-check passes
        Directory.CreateDirectory(path);
        LibGit2Sharp.Repository.Init(path);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ImportAsync(path));
    }

    [Fact]
    public void GetAll_ReturnsLoadedRepos()
    {
        var repos = new List<RepositoryInfo>
        {
            new() { Id = "id-1", Name = "repo-a", LocalPath = "/a", CurrentBranch = "main" },
        };
        _store.Load().Returns(repos);
        var service = new RepositoryService(_store);

        var result = service.GetAll();

        Assert.Single(result);
        Assert.Equal("repo-a", result[0].Name);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempPath))
            Directory.Delete(_tempPath, recursive: true);
    }
}
