using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class RepositoryInfoTests
{
    [Fact]
    public void RepositoryInfo_Properties_AreAccessible()
    {
        var info = new RepositoryInfo("id-1", "my-repo", "/path/to/repo", "https://github.com/x/y", "main");

        Assert.Equal("id-1", info.Id);
        Assert.Equal("my-repo", info.Name);
        Assert.Equal("/path/to/repo", info.LocalPath);
        Assert.Equal("https://github.com/x/y", info.RemoteUrl);
        Assert.Equal("main", info.CurrentBranch);
    }

    [Fact]
    public void RepositoryInfo_RemoteUrl_CanBeNull()
    {
        var info = new RepositoryInfo("id-2", "local-repo", "/path", null, "main");

        Assert.Null(info.RemoteUrl);
    }
}
