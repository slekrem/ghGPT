namespace ghGPT.Core.Repositories;

public class BranchInfo
{
    public string Name { get; init; } = string.Empty;
    public bool IsRemote { get; init; }
    public bool IsHead { get; init; }
    public int AheadBy { get; init; }
    public int BehindBy { get; init; }
    public string? TrackingBranch { get; init; }
}
