using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class RemoteUrlParserTests
{
    [Theory]
    [InlineData("https://github.com/slekrem/ghGPT", "slekrem", "ghGPT")]
    [InlineData("https://github.com/slekrem/ghGPT.git", "slekrem", "ghGPT")]
    [InlineData("git@github.com:slekrem/ghGPT", "slekrem", "ghGPT")]
    [InlineData("git@github.com:slekrem/ghGPT.git", "slekrem", "ghGPT")]
    [InlineData("https://github.com/my-org/my-repo", "my-org", "my-repo")]
    [InlineData("git@github.com:my-org/my-repo.git", "my-org", "my-repo")]
    public void Parse_ReturnsOwnerAndRepo(string remoteUrl, string expectedOwner, string expectedRepo)
    {
        var (owner, repo) = RemoteUrlParser.Parse(remoteUrl);

        Assert.Equal(expectedOwner, owner);
        Assert.Equal(expectedRepo, repo);
    }

    [Theory]
    [InlineData("https://gitlab.com/owner/repo")]
    [InlineData("git@bitbucket.org:owner/repo.git")]
    [InlineData("not-a-url")]
    [InlineData("")]
    public void Parse_ThrowsForNonGitHubUrls(string remoteUrl)
    {
        Assert.Throws<InvalidOperationException>(() => RemoteUrlParser.Parse(remoteUrl));
    }
}
