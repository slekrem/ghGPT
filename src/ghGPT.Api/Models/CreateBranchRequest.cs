namespace ghGPT.Api.Models;

public class CreateBranchRequest
{
    public string Name { get; init; } = string.Empty;
    public string? StartPoint { get; init; }
}
