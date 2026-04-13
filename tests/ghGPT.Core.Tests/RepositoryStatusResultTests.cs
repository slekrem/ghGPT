using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class RepositoryStatusResultTests
{
    [Fact]
    public void RepositoryStatusResult_DefaultIsEmpty()
    {
        var result = new RepositoryStatusResult();

        Assert.Empty(result.Staged);
        Assert.Empty(result.Unstaged);
    }

    [Fact]
    public void RepositoryStatusResult_StagedAndUnstaged_AreIndependent()
    {
        var result = new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "a.cs", IsStaged = true }],
            Unstaged = [
                new FileStatusEntry { FilePath = "b.cs", IsStaged = false },
                new FileStatusEntry { FilePath = "c.cs", IsStaged = false }
            ]
        };

        Assert.Single(result.Staged);
        Assert.Equal(2, result.Unstaged.Count);
    }

    [Fact]
    public void RepositoryStatusResult_CollectionsAreReadOnly()
    {
        var result = new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "a.cs" }]
        };

        Assert.IsAssignableFrom<IReadOnlyList<FileStatusEntry>>(result.Staged);
        Assert.IsAssignableFrom<IReadOnlyList<FileStatusEntry>>(result.Unstaged);
    }

    [Fact]
    public void RepositoryStatusResult_Clean_HasNoEntries()
    {
        var result = new RepositoryStatusResult { Staged = [], Unstaged = [] };

        Assert.Equal(0, result.Staged.Count + result.Unstaged.Count);
    }
}
