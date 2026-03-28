namespace ghGPT.Core.Repositories;

public record RepositoryInfo(
    string Id,
    string Name,
    string LocalPath,
    string? RemoteUrl,
    string CurrentBranch
);
