namespace ghGPT.Core.Repositories;

public interface IBranchService
{
    IReadOnlyList<BranchInfo> GetBranches(string id);
    void CheckoutBranch(string id, string branchName, CheckoutStrategy strategy = CheckoutStrategy.Normal, string? stashMessage = null);
    BranchInfo CreateBranch(string id, string name, string? startPoint = null);
    Task DeleteBranch(string id, string branchName);
}
