using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class UncommittedChangesExceptionTests
{
    [Fact]
    public void UncommittedChangesException_IsException()
    {
        Assert.IsAssignableFrom<Exception>(new UncommittedChangesException());
    }

    [Fact]
    public void UncommittedChangesException_HasExpectedMessage()
    {
        var ex = new UncommittedChangesException();

        Assert.Equal("Uncommitted changes vorhanden.", ex.Message);
    }

    [Fact]
    public void UncommittedChangesException_CanBeCaughtAsException()
    {
        static void Throw() => throw new UncommittedChangesException();

        Assert.Throws<UncommittedChangesException>(Throw);
    }

    [Fact]
    public void UncommittedChangesException_InnerException_IsNull()
    {
        var ex = new UncommittedChangesException();

        Assert.Null(ex.InnerException);
    }
}
