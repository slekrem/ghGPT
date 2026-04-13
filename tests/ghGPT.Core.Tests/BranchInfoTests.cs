using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class BranchInfoTests
{
    [Fact]
    public void BranchInfo_DefaultValues()
    {
        var info = new BranchInfo();

        Assert.Equal(string.Empty, info.Name);
        Assert.False(info.IsRemote);
        Assert.False(info.IsHead);
        Assert.Equal(0, info.AheadBy);
        Assert.Equal(0, info.BehindBy);
        Assert.Null(info.TrackingBranch);
    }

    [Fact]
    public void BranchInfo_IsUpToDate_WhenAheadAndBehindAreZero()
    {
        var info = new BranchInfo { Name = "main", TrackingBranch = "origin/main", AheadBy = 0, BehindBy = 0 };

        Assert.Equal(0, info.AheadBy);
        Assert.Equal(0, info.BehindBy);
    }

    [Fact]
    public void BranchInfo_TrackingBranch_NullMeansNoTracking()
    {
        var local = new BranchInfo { Name = "feature/x", TrackingBranch = null };
        var tracked = new BranchInfo { Name = "main", TrackingBranch = "origin/main" };

        Assert.Null(local.TrackingBranch);
        Assert.NotNull(tracked.TrackingBranch);
    }

    [Fact]
    public void BranchInfo_RemoteBranch_HasIsRemoteTrue()
    {
        var remote = new BranchInfo { Name = "origin/main", IsRemote = true };
        var local = new BranchInfo { Name = "main", IsRemote = false };

        Assert.True(remote.IsRemote);
        Assert.False(local.IsRemote);
    }

    [Fact]
    public void BranchInfo_ActiveBranch_HasIsHeadTrue()
    {
        var head = new BranchInfo { Name = "main", IsHead = true };
        var other = new BranchInfo { Name = "feature", IsHead = false };

        Assert.True(head.IsHead);
        Assert.False(other.IsHead);
    }
}
