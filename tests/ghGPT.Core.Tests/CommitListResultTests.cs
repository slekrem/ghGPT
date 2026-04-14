using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class CommitListResultTests
{
    [Fact]
    public void CommitListResult_DefaultValues()
    {
        var result = new CommitListResult();

        Assert.Equal(string.Empty, result.Branch);
        Assert.Empty(result.Commits);
        Assert.False(result.HasMore);
    }

    [Fact]
    public void CommitListResult_HasMore_TrueWhenMoreCommitsExist()
    {
        var result = new CommitListResult
        {
            Branch = "main",
            Commits = [new CommitListItem { Sha = "abc", Message = "feat: test" }],
            HasMore = true
        };

        Assert.True(result.HasMore);
    }

    [Fact]
    public void CommitListResult_HasMore_FalseOnLastPage()
    {
        var result = new CommitListResult
        {
            Branch = "main",
            Commits = [new CommitListItem { Sha = "abc", Message = "initial" }],
            HasMore = false
        };

        Assert.False(result.HasMore);
    }

    [Fact]
    public void CommitListResult_CommitsIsReadOnly()
    {
        var result = new CommitListResult
        {
            Commits = [new CommitListItem { Sha = "abc" }, new CommitListItem { Sha = "def" }]
        };

        Assert.IsAssignableFrom<IReadOnlyList<CommitListItem>>(result.Commits);
        Assert.Equal(2, result.Commits.Count);
    }
}
