namespace ghGPT.Api.Models;

public class CreateRepoRequest
{
    public string LocalPath { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}
