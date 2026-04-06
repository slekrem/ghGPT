namespace ghGPT.Core.Account;

public interface IAccountService
{
    Task<AccountInfo?> GetAccountAsync();
}
