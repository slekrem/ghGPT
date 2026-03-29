namespace ghGPT.Core.Account;

public interface IAccountService
{
    Task<AccountInfo?> GetAccountAsync();
    Task<AccountInfo> SaveTokenAsync(string token);
    void RemoveAccount();
}
