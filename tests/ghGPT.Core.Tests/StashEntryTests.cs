using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class StashEntryTests
{
    [Fact]
    public void StashEntry_RecordEquality_TwoIdenticalEntriesAreEqual()
    {
        var date = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var a = new StashEntry { Index = 0, Message = "WIP", Branch = "main", CreatedAt = date };
        var b = new StashEntry { Index = 0, Message = "WIP", Branch = "main", CreatedAt = date };

        Assert.Equal(a, b);
    }

    [Fact]
    public void StashEntry_RecordEquality_DifferentIndexNotEqual()
    {
        var date = DateTimeOffset.UtcNow;
        var a = new StashEntry { Index = 0, Message = "WIP", Branch = "main", CreatedAt = date };
        var b = new StashEntry { Index = 1, Message = "WIP", Branch = "main", CreatedAt = date };

        Assert.NotEqual(a, b);
    }

    [Fact]
    public void StashEntry_DefaultValues_AreEmpty()
    {
        var entry = new StashEntry();

        Assert.Equal(0, entry.Index);
        Assert.Equal(string.Empty, entry.Message);
        Assert.Equal(string.Empty, entry.Branch);
        Assert.Equal(default, entry.CreatedAt);
    }

    [Fact]
    public void StashEntry_PropertiesAreImmutable()
    {
        var original = new StashEntry { Index = 0, Message = "WIP", Branch = "main" };
        var copy = original with { Index = 1 };

        Assert.Equal(0, original.Index);
        Assert.Equal(1, copy.Index);
        Assert.Equal(original.Message, copy.Message);
    }
}
