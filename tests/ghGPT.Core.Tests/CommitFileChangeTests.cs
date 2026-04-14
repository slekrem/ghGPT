using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class CommitFileChangeTests
{
    [Fact]
    public void CommitFileChange_DefaultValues()
    {
        var change = new CommitFileChange();

        Assert.Equal(string.Empty, change.Path);
        Assert.Null(change.OldPath);
        Assert.Equal(string.Empty, change.Status);
        Assert.Equal(0, change.Additions);
        Assert.Equal(0, change.Deletions);
        Assert.Equal(string.Empty, change.Patch);
    }

    [Fact]
    public void CommitFileChange_OldPath_NullForNonRenames()
    {
        var modified = new CommitFileChange { Path = "file.cs", Status = "Modified" };
        var renamed = new CommitFileChange { Path = "new.cs", OldPath = "old.cs", Status = "Renamed" };

        Assert.Null(modified.OldPath);
        Assert.Equal("old.cs", renamed.OldPath);
    }

    [Fact]
    public void CommitFileChange_AdditionsAndDeletions_ReflectDiffStats()
    {
        var change = new CommitFileChange
        {
            Path = "Service.cs",
            Status = "Modified",
            Additions = 10,
            Deletions = 3
        };

        Assert.Equal(10, change.Additions);
        Assert.Equal(3, change.Deletions);
    }

    [Fact]
    public void CommitFileChange_Patch_ContainsDiffContent()
    {
        var patch = "@@ -1,3 +1,4 @@\n line\n+new line\n line\n line\n";
        var change = new CommitFileChange { Path = "file.cs", Patch = patch };

        Assert.Contains("@@", change.Patch);
        Assert.Contains("+new line", change.Patch);
    }
}
