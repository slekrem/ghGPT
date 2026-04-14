using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class FileStatusEntryTests
{
    [Theory]
    [InlineData("Modified")]
    [InlineData("Added")]
    [InlineData("Deleted")]
    [InlineData("Renamed")]
    [InlineData("Untracked")]
    public void FileStatusEntry_AcceptsAllKnownStatusValues(string status)
    {
        var entry = new FileStatusEntry { FilePath = "file.cs", Status = status };

        Assert.Equal(status, entry.Status);
    }

    [Fact]
    public void FileStatusEntry_DefaultValues()
    {
        var entry = new FileStatusEntry();

        Assert.Equal(string.Empty, entry.FilePath);
        Assert.Equal(string.Empty, entry.Status);
        Assert.False(entry.IsStaged);
    }

    [Fact]
    public void FileStatusEntry_IsStaged_ReflectsStagingState()
    {
        var staged = new FileStatusEntry { FilePath = "a.cs", Status = "Modified", IsStaged = true };
        var unstaged = new FileStatusEntry { FilePath = "b.cs", Status = "Modified", IsStaged = false };

        Assert.True(staged.IsStaged);
        Assert.False(unstaged.IsStaged);
    }

    [Fact]
    public void FileStatusEntry_FilePath_CanIncludeDirectories()
    {
        var entry = new FileStatusEntry { FilePath = "src/feature/Service.cs" };

        Assert.Equal("src/feature/Service.cs", entry.FilePath);
    }
}
