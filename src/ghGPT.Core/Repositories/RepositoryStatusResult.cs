namespace ghGPT.Core.Repositories;

public class RepositoryStatusResult
{
    public IReadOnlyList<FileStatusEntry> Staged { get; init; } = [];
    public IReadOnlyList<FileStatusEntry> Unstaged { get; init; } = [];
}
