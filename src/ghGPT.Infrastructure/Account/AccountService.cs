using GhCli.Net.Abstractions;
using ghGPT.Core.Account;

namespace ghGPT.Infrastructure.Account;

public class AccountService(IUserClient userClient) : IAccountService
{
    public async Task<AccountInfo?> GetAccountAsync()
    {
        try
        {
            var user = await userClient.GetCurrentAsync();
            return new AccountInfo(user.Login, user.Name ?? user.Login, user.AvatarUrl);
        }
        catch
        {
            return null;
        }
    }
}
