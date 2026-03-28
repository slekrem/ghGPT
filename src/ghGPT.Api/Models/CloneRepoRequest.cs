namespace ghGPT.Api.Models;

public class CloneRepoRequest
{
    public string RemoteUrl { get; init; } = string.Empty;
    public string LocalPath { get; init; } = string.Empty;
}
