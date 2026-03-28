using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;

namespace ghGPT.Infrastructure.Tests;

public class RepositoryStoreTests : IDisposable
{
    private readonly string _tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    private RepositoryStore CreateStore()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["ghGPT:RepositoriesPath"] = _tempPath })
            .Build();
        return new RepositoryStore(config);
    }

    [Fact]
    public void Load_ReturnsEmpty_WhenFileDoesNotExist()
    {
        var store = CreateStore();
        var result = store.Load();
        Assert.Empty(result);
    }

    [Fact]
    public void SaveAndLoad_RoundTrip()
    {
        var store = CreateStore();
        var repos = new List<RepositoryInfo>
        {
            new("id-1", "repo-a", "/path/a", null, "main"),
            new("id-2", "repo-b", "/path/b", "https://github.com/x/y", "develop"),
        };

        store.Save(repos);
        var loaded = store.Load();

        Assert.Equal(2, loaded.Count);
        Assert.Equal("repo-a", loaded[0].Name);
        Assert.Equal("develop", loaded[1].CurrentBranch);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempPath))
            Directory.Delete(_tempPath, recursive: true);
    }
}
