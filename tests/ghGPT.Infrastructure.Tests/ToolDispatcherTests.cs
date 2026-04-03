using ghGPT.Core.Ai;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Ai;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Infrastructure.Tests;

public class ToolDispatcherTests
{
    private readonly IRepositoryService _repositoryService = Substitute.For<IRepositoryService>();
    private readonly ToolDispatcher _sut;

    public ToolDispatcherTests()
    {
        _sut = new ToolDispatcher(_repositoryService);
    }

    // --- get_status ---

    [Fact]
    public async Task GetStatus_WithChanges_ReturnsFormattedOutput()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [new FileStatusEntry { FilePath = "Program.cs", Status = "Modified", IsStaged = true }],
            Unstaged = [new FileStatusEntry { FilePath = "README.md", Status = "Modified", IsStaged = false }]
        });

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("get_status"), "repo-1");

        Assert.True(success);
        Assert.Contains("Program.cs", result);
        Assert.Contains("README.md", result);
        Assert.Contains("Staged", result);
        Assert.Contains("Unstaged", result);
    }

    [Fact]
    public async Task GetStatus_WithNoChanges_ReturnsCleanMessage()
    {
        _repositoryService.GetStatus("repo-1").Returns(new RepositoryStatusResult
        {
            Staged = [],
            Unstaged = []
        });

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("get_status"), "repo-1");

        Assert.True(success);
        Assert.Contains("sauber", result);
    }

    [Fact]
    public async Task GetStatus_WhenServiceThrows_ReturnsErrorResult()
    {
        _repositoryService.GetStatus("repo-1").Throws(new Exception("git error"));

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("get_status"), "repo-1");

        Assert.False(success);
        Assert.Contains("Fehler", result);
    }

    // --- get_branches ---

    [Fact]
    public async Task GetBranches_ReturnsBothLocalAndRemoteBranches()
    {
        _repositoryService.GetBranches("repo-1").Returns([
            new BranchInfo { Name = "main", IsHead = true, IsRemote = false },
            new BranchInfo { Name = "feature/x", IsHead = false, IsRemote = false },
            new BranchInfo { Name = "origin/main", IsHead = false, IsRemote = true }
        ]);

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("get_branches"), "repo-1");

        Assert.True(success);
        Assert.Contains("main", result);
        Assert.Contains("feature/x", result);
        Assert.Contains("origin/main", result);
        Assert.Contains("aktiv", result);
    }

    // --- checkout_branch ---

    [Fact]
    public async Task CheckoutBranch_CallsServiceWithCorrectName()
    {
        var (result, displayArgs, success) = await _sut.DispatchAsync(
            ToolCall("checkout_branch", """{"name":"feature/x"}"""), "repo-1");

        Assert.True(success);
        Assert.Contains("feature/x", result);
        _repositoryService.Received(1).CheckoutBranch("repo-1", "feature/x");
    }

    [Fact]
    public async Task CheckoutBranch_WithMissingName_ReturnsError()
    {
        var (result, _, success) = await _sut.DispatchAsync(
            ToolCall("checkout_branch", "{}"), "repo-1");

        Assert.False(success);
        _repositoryService.DidNotReceive().CheckoutBranch(Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task CheckoutBranch_WhenServiceThrows_ReturnsErrorResult()
    {
        _repositoryService.When(s => s.CheckoutBranch("repo-1", "ghost"))
            .Throw(new InvalidOperationException("Branch nicht gefunden."));

        var (result, _, success) = await _sut.DispatchAsync(
            ToolCall("checkout_branch", """{"name":"ghost"}"""), "repo-1");

        Assert.False(success);
        Assert.Contains("Fehler", result);
    }

    // --- create_branch ---

    [Fact]
    public async Task CreateBranch_CallsServiceAndReturnsSuccess()
    {
        _repositoryService.CreateBranch("repo-1", "feature/new", null)
            .Returns(new BranchInfo { Name = "feature/new" });

        var (result, displayArgs, success) = await _sut.DispatchAsync(
            ToolCall("create_branch", """{"name":"feature/new"}"""), "repo-1");

        Assert.True(success);
        Assert.Contains("feature/new", result);
        _repositoryService.Received(1).CreateBranch("repo-1", "feature/new", null);
    }

    [Fact]
    public async Task CreateBranch_WithStartPoint_PassesStartPointToService()
    {
        _repositoryService.CreateBranch("repo-1", "feature/new", "main")
            .Returns(new BranchInfo { Name = "feature/new" });

        await _sut.DispatchAsync(
            ToolCall("create_branch", """{"name":"feature/new","start_point":"main"}"""), "repo-1");

        _repositoryService.Received(1).CreateBranch("repo-1", "feature/new", "main");
    }

    [Fact]
    public async Task CreateBranch_WithMissingName_ReturnsError()
    {
        var (_, _, success) = await _sut.DispatchAsync(
            ToolCall("create_branch", "{}"), "repo-1");

        Assert.False(success);
        _repositoryService.DidNotReceive().CreateBranch(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    // --- get_history ---

    [Fact]
    public async Task GetHistory_ReturnsFormattedCommitList()
    {
        _repositoryService.GetHistory("repo-1", 10).Returns([
            new CommitHistoryEntry { ShortSha = "abc1234", Message = "feat: add login", AuthorName = "Stefan", AuthorDate = new DateTime(2026, 1, 1) },
            new CommitHistoryEntry { ShortSha = "def5678", Message = "fix: correct redirect", AuthorName = "Stefan", AuthorDate = new DateTime(2026, 1, 2) }
        ]);

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("get_history"), "repo-1");

        Assert.True(success);
        Assert.Contains("abc1234", result);
        Assert.Contains("feat: add login", result);
        Assert.Contains("def5678", result);
    }

    [Fact]
    public async Task GetHistory_WithCountParam_PassesCountToService()
    {
        _repositoryService.GetHistory("repo-1", 5).Returns([]);

        await _sut.DispatchAsync(ToolCall("get_history", """{"count":5}"""), "repo-1");

        _repositoryService.Received(1).GetHistory("repo-1", 5);
    }

    [Fact]
    public async Task GetHistory_ClampsCountToMaximum()
    {
        _repositoryService.GetHistory("repo-1", 50).Returns([]);

        await _sut.DispatchAsync(ToolCall("get_history", """{"count":999}"""), "repo-1");

        _repositoryService.Received(1).GetHistory("repo-1", 50);
    }

    // --- fetch ---

    [Fact]
    public async Task Fetch_CallsFetchAsyncAndReturnsSuccess()
    {
        _repositoryService.FetchAsync("repo-1", Arg.Any<IProgress<string>?>()).Returns(Task.CompletedTask);

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("fetch"), "repo-1");

        Assert.True(success);
        await _repositoryService.Received(1).FetchAsync("repo-1", Arg.Any<IProgress<string>?>());
    }

    [Fact]
    public async Task Fetch_WhenServiceThrows_ReturnsErrorResult()
    {
        _repositoryService.FetchAsync("repo-1", Arg.Any<IProgress<string>?>())
            .ThrowsAsync(new Exception("network error"));

        var (result, _, success) = await _sut.DispatchAsync(ToolCall("fetch"), "repo-1");

        Assert.False(success);
        Assert.Contains("Fehler", result);
    }

    // --- unknown tool ---

    [Fact]
    public async Task Dispatch_UnknownTool_ReturnsErrorResult()
    {
        var (result, _, success) = await _sut.DispatchAsync(ToolCall("unknown_tool"), "repo-1");

        Assert.False(success);
        Assert.Contains("unknown_tool", result);
    }

    // --- Helper ---

    private static ToolCall ToolCall(string name, string argumentsJson = "{}") =>
        new() { Id = "call-1", Name = name, ArgumentsJson = argumentsJson };
}
