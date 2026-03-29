using ghGPT.Core.Repositories;
using ghGPT.Infrastructure.Repositories;
using NSubstitute;

namespace ghGPT.Infrastructure.Tests;

public class RepositoryServiceTests : IDisposable
{
    private readonly string _tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    private readonly IRepositoryStore _store = Substitute.For<IRepositoryStore>();

    public RepositoryServiceTests()
    {
        _store.Load().Returns([]);
    }

    // --- Helpers ---

    private string CreateGitRepo(string name = "repo")
    {
        var path = Path.Combine(_tempPath, name);
        Directory.CreateDirectory(path);
        Run("git init", path);
        Run("git config user.email test@test.com", path);
        Run("git config user.name Test", path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Hello\n\nLine three\nLine four\nLine five\nLine six\n");
        Run("git add .", path);
        Run("git commit -m initial", path);
        return path;
    }

    private string CreateGitRepoWithCommitCount(string name, int additionalCommits)
    {
        var path = CreateGitRepo(name);
        var filePath = Path.Combine(path, "README.md");

        for (var i = 1; i <= additionalCommits; i++)
        {
            File.WriteAllText(filePath, $"# Commit {i}\n");
            Run("git add README.md", path);
            Run($"git commit -m commit-{i}", path);
        }

        return path;
    }

    private static void Run(string cmd, string cwd)
    {
        var parts = cmd.Split(' ', 2);
        var psi = new System.Diagnostics.ProcessStartInfo(parts[0], parts.Length > 1 ? parts[1] : "")
        {
            WorkingDirectory = cwd,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        using var p = System.Diagnostics.Process.Start(psi)!;
        p.WaitForExit();
    }

    private RepositoryService ServiceWithRepo(string path)
    {
        var info = new RepositoryInfo { Id = "id-1", Name = "repo", LocalPath = path, CurrentBranch = "master" };
        _store.Load().Returns([info]);
        return new RepositoryService(_store);
    }

    // --- Create / Import ---

    [Fact]
    public async Task CreateAsync_InitializesGitRepo()
    {
        var path = Path.Combine(_tempPath, "new-repo");
        var service = new RepositoryService(_store);

        var result = await service.CreateAsync(path, "new-repo");

        Assert.True(Directory.Exists(path));
        Assert.True(Directory.Exists(Path.Combine(path, ".git")));
        Assert.Equal("new-repo", result.Name);
        Assert.Equal(path, result.LocalPath);
        _store.Received(1).Save(Arg.Any<IReadOnlyList<RepositoryInfo>>());
    }

    [Fact]
    public async Task ImportAsync_ThrowsWhenNotAGitRepo()
    {
        var path = Path.Combine(_tempPath, "not-a-repo");
        Directory.CreateDirectory(path);
        var service = new RepositoryService(_store);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ImportAsync(path));
    }

    [Fact]
    public async Task ImportAsync_ThrowsWhenAlreadyImported()
    {
        var path = Path.Combine(_tempPath, "existing-repo");
        var existing = new RepositoryInfo { Id = "id-1", Name = "existing-repo", LocalPath = path, CurrentBranch = "main" };
        _store.Load().Returns([existing]);
        var service = new RepositoryService(_store);

        Directory.CreateDirectory(path);
        LibGit2Sharp.Repository.Init(path);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ImportAsync(path));
    }

    [Fact]
    public void GetAll_ReturnsLoadedRepos()
    {
        var repos = new List<RepositoryInfo>
        {
            new() { Id = "id-1", Name = "repo-a", LocalPath = "/a", CurrentBranch = "main" },
        };
        _store.Load().Returns(repos);
        var service = new RepositoryService(_store);

        var result = service.GetAll();

        Assert.Single(result);
        Assert.Equal("repo-a", result[0].Name);
    }

    // --- Active repo ---

    [Fact]
    public void GetActive_ReturnsNullInitially()
    {
        var service = new RepositoryService(_store);
        Assert.Null(service.GetActive());
    }

    [Fact]
    public void SetActive_AndGetActive_ReturnCorrectRepo()
    {
        var path = CreateGitRepo("active-repo");
        var service = ServiceWithRepo(path);

        service.SetActive("id-1");

        Assert.Equal("id-1", service.GetActive()?.Id);
    }

    [Fact]
    public void SetActive_ThrowsForUnknownId()
    {
        var service = new RepositoryService(_store);
        Assert.Throws<InvalidOperationException>(() => service.SetActive("unknown"));
    }

    // --- Remove ---

    [Fact]
    public void Remove_RemovesRepoFromList()
    {
        var info = new RepositoryInfo { Id = "id-1", Name = "r", LocalPath = "/x", CurrentBranch = "main" };
        _store.Load().Returns([info]);
        var service = new RepositoryService(_store);

        service.Remove("id-1");

        Assert.Empty(service.GetAll());
        _store.Received().Save(Arg.Any<IReadOnlyList<RepositoryInfo>>());
    }

    [Fact]
    public void Remove_ClearsActiveRepoWhenRemoved()
    {
        var path = CreateGitRepo("remove-active");
        var service = ServiceWithRepo(path);
        service.SetActive("id-1");

        service.Remove("id-1");

        Assert.Null(service.GetActive());
    }

    // --- Status ---

    [Fact]
    public void GetStatus_ShowsModifiedFileAsUnstaged()
    {
        var path = CreateGitRepo("status-repo");
        var service = ServiceWithRepo(path);

        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");

        var status = service.GetStatus("id-1");

        Assert.Contains(status.Unstaged, f => f.FilePath == "README.md" && f.Status == "Modified");
        Assert.Empty(status.Staged);
    }

    [Fact]
    public void GetStatus_ShowsModifiedFileAsStaged_AfterStage()
    {
        var path = CreateGitRepo("status-staged-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");

        service.StageFile("id-1", "README.md");
        var status = service.GetStatus("id-1");

        Assert.Contains(status.Staged, f => f.FilePath == "README.md" && f.Status == "Modified");
        Assert.Empty(status.Unstaged);
    }

    [Fact]
    public void GetHistory_ReturnsNewestCommitFirst()
    {
        var path = CreateGitRepo("history-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        service.StageFile("id-1", "README.md");
        service.Commit("id-1", "feat: history test");

        var history = service.GetHistory("id-1");

        Assert.NotEmpty(history);
        Assert.Equal("feat: history test", history[0].Message);
        Assert.Equal(7, history[0].ShortSha.Length);
    }

    [Fact]
    public void GetCommits_ReturnsPagedBranchHistory()
    {
        var path = CreateGitRepo("commits-page-repo");
        var service = ServiceWithRepo(path);

        File.WriteAllText(Path.Combine(path, "README.md"), "# Change 1\n");
        service.StageFile("id-1", "README.md");
        service.Commit("id-1", "feat: first");

        File.WriteAllText(Path.Combine(path, "README.md"), "# Change 2\n");
        service.StageFile("id-1", "README.md");
        service.Commit("id-1", "feat: second");

        var page = service.GetCommits("id-1", "master", skip: 0, take: 1);

        Assert.Single(page.Commits);
        Assert.Equal("master", page.Branch);
        Assert.Equal("feat: second", page.Commits[0].Message);
        Assert.True(page.HasMore);
    }

    [Fact]
    public void GetCommitDetail_ReturnsFilesAndPatch()
    {
        var path = CreateGitRepo("commit-detail-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Detailed Change\n");
        service.StageFile("id-1", "README.md");
        service.Commit("id-1", "feat: detail");

        using var repo = new LibGit2Sharp.Repository(path);
        var detail = service.GetCommitDetail("id-1", repo.Head.Tip.Sha);

        Assert.Equal("feat: detail", detail.Message);
        Assert.Contains(detail.Files, file => file.Path == "README.md" && file.Patch.Contains("+# Detailed Change"));
    }

    [Fact]
    public void GetCommits_CanPageThroughLargeHistory()
    {
        var path = CreateGitRepoWithCommitCount("large-history-repo", 220);
        var service = ServiceWithRepo(path);

        var firstPage = service.GetCommits("id-1", "master", skip: 0, take: 100);
        var thirdPage = service.GetCommits("id-1", "master", skip: 200, take: 100);

        Assert.Equal(100, firstPage.Commits.Count);
        Assert.True(firstPage.HasMore);
        Assert.Equal(21, thirdPage.Commits.Count);
        Assert.False(thirdPage.HasMore);
        Assert.Equal("commit-220", firstPage.Commits[0].Message);
        Assert.DoesNotContain(firstPage.Commits.Select(commit => commit.Sha), sha => thirdPage.Commits.Any(other => other.Sha == sha));
        Assert.Equal("initial", thirdPage.Commits[^1].Message);
        Assert.All(thirdPage.Commits.Take(thirdPage.Commits.Count - 1), commit => Assert.StartsWith("commit-", commit.Message));
    }

    // --- Diff ---

    [Fact]
    public void GetDiff_ReturnsNonEmptyDiffForModifiedFile()
    {
        var path = CreateGitRepo("diff-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");

        var diff = service.GetDiff("id-1", "README.md", staged: false);

        Assert.False(string.IsNullOrWhiteSpace(diff));
        Assert.Contains("@@", diff);
    }

    [Fact]
    public void GetDiff_ReturnsStagedDiff_AfterStage()
    {
        var path = CreateGitRepo("diff-staged-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        service.StageFile("id-1", "README.md");

        var diff = service.GetDiff("id-1", "README.md", staged: true);

        Assert.False(string.IsNullOrWhiteSpace(diff));
        Assert.Contains("@@", diff);
    }

    [Fact]
    public void GetDiff_ReturnsDiffForUntrackedFile()
    {
        var path = CreateGitRepo("diff-untracked-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "new-file.txt"), "new file content\n");

        var diff = service.GetDiff("id-1", "new-file.txt", staged: false);

        Assert.False(string.IsNullOrWhiteSpace(diff));
        Assert.Contains("new file content", diff);
    }

    // --- Stage / Unstage ---

    [Fact]
    public void StageFile_MovesFileToStaged()
    {
        var path = CreateGitRepo("stage-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");

        service.StageFile("id-1", "README.md");

        var status = service.GetStatus("id-1");
        Assert.Contains(status.Staged, f => f.FilePath == "README.md");
        Assert.Empty(status.Unstaged);
    }

    [Fact]
    public void UnstageFile_MovesFileBackToUnstaged()
    {
        var path = CreateGitRepo("unstage-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        service.StageFile("id-1", "README.md");

        service.UnstageFile("id-1", "README.md");

        var status = service.GetStatus("id-1");
        Assert.Contains(status.Unstaged, f => f.FilePath == "README.md");
        Assert.Empty(status.Staged);
    }

    [Fact]
    public void StageAll_StagesAllModifiedFiles()
    {
        var path = CreateGitRepo("stageall-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        File.WriteAllText(Path.Combine(path, "new-file.txt"), "new\n");

        service.StageAll("id-1");

        var status = service.GetStatus("id-1");
        Assert.Empty(status.Unstaged);
        Assert.NotEmpty(status.Staged);
    }

    [Fact]
    public void UnstageAll_MovesAllStagedFilesBackToUnstaged()
    {
        var path = CreateGitRepo("unstageall-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        service.StageAll("id-1");

        service.UnstageAll("id-1");

        var status = service.GetStatus("id-1");
        Assert.Empty(status.Staged);
        Assert.Contains(status.Unstaged, f => f.FilePath == "README.md");
    }

    // --- Commit ---

    [Fact]
    public void Commit_CreatesCommitWithStagedFiles()
    {
        var path = CreateGitRepo("commit-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        service.StageFile("id-1", "README.md");

        service.Commit("id-1", "test: first commit");

        using var repo = new LibGit2Sharp.Repository(path);
        Assert.Equal("test: first commit", repo.Head.Tip.Message.Trim());
        Assert.Empty(service.GetStatus("id-1").Staged);
    }

    [Fact]
    public void Commit_IncludesDescriptionInMessage()
    {
        var path = CreateGitRepo("commit-desc-repo");
        var service = ServiceWithRepo(path);
        File.WriteAllText(Path.Combine(path, "README.md"), "# Changed\n");
        service.StageFile("id-1", "README.md");

        service.Commit("id-1", "feat: title", "some description");

        using var repo = new LibGit2Sharp.Repository(path);
        Assert.Contains("feat: title", repo.Head.Tip.Message);
        Assert.Contains("some description", repo.Head.Tip.Message);
    }

    [Fact]
    public void Commit_ThrowsWhenNothingStaged()
    {
        var path = CreateGitRepo("commit-empty-repo");
        var service = ServiceWithRepo(path);

        Assert.Throws<InvalidOperationException>(() => service.Commit("id-1", "should fail"));
    }

    [Fact]
    public void Commit_SucceedsWhenOnlyDeletionsAreStaged()
    {
        var path = CreateGitRepo("commit-delete-repo");
        var service = ServiceWithRepo(path);

        // Delete the tracked README.md and stage the deletion
        File.Delete(Path.Combine(path, "README.md"));
        service.StageFile("id-1", "README.md");

        // Should not throw even though the deleted file is removed from the index
        service.Commit("id-1", "chore: remove readme");

        using var repo = new LibGit2Sharp.Repository(path);
        Assert.Equal("chore: remove readme", repo.Head.Tip.Message.Trim());
    }

    public void Dispose()
    {
        if (!Directory.Exists(_tempPath)) return;
        // Git objects on Windows have read-only attributes — clear them before deletion
        foreach (var file in Directory.EnumerateFiles(_tempPath, "*", SearchOption.AllDirectories))
            File.SetAttributes(file, FileAttributes.Normal);
        Directory.Delete(_tempPath, recursive: true);
    }
}
