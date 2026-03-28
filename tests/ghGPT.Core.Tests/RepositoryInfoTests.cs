using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class RepositoryInfoTests
{
    [Fact]
    public void RepositoryInfo_Properties_AreAccessible()
    {
        var info = new RepositoryInfo { Id = "id-1", Name = "my-repo", LocalPath = "/path/to/repo", RemoteUrl = "https://github.com/x/y", CurrentBranch = "main" };

        Assert.Equal("id-1", info.Id);
        Assert.Equal("my-repo", info.Name);
        Assert.Equal("/path/to/repo", info.LocalPath);
        Assert.Equal("https://github.com/x/y", info.RemoteUrl);
        Assert.Equal("main", info.CurrentBranch);
    }

    [Fact]
    public void RepositoryInfo_RemoteUrl_CanBeNull()
    {
        var info = new RepositoryInfo { Id = "id-2", Name = "local-repo", LocalPath = "/path", CurrentBranch = "main" };

        Assert.Null(info.RemoteUrl);
    }
}
