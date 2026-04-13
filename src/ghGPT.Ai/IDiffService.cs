namespace ghGPT.Ai;

public interface IDiffService
{
    string BuildStagedDiff(string repoId);
    string BuildCombinedDiff(string repoId);
}
