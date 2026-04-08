using ghGPT.Core.Repositories;

namespace ghGPT.Api.Models;

public class CheckoutBranchRequest
{
    public string Name { get; init; } = string.Empty;
    public CheckoutStrategy Strategy { get; init; } = CheckoutStrategy.Normal;
    public string? StashMessage { get; init; }
}
