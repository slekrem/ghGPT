namespace ghGPT.Core.Repositories;

public class RepositoryInfo
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string LocalPath { get; init; } = string.Empty;
    public string? RemoteUrl { get; init; }
    public string CurrentBranch { get; set; } = string.Empty;
}
