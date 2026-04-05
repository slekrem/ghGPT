using GhCli.Net.Abstractions;
using ghGPT.Core.Account;

namespace ghGPT.Infrastructure.Account;

public class AccountService(ITokenStore tokenStore, IGhCliRunner runner, IUserClient userClient) : IAccountService
{
    public async Task<AccountInfo?> GetAccountAsync()
    {
        var token = tokenStore.Load();
        if (token is null)
            return null;

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

    public async Task<AccountInfo> SaveTokenAsync(string token)
    {
        try
        {
            await runner.RunWithInputAsync(token, "auth", "login", "--with-token");
        }
        catch (InvalidOperationException)
        {
            throw new InvalidOperationException("Der Token ist ungültig oder abgelaufen.");
        }

        AccountInfo info;
        try
        {
            var user = await userClient.GetCurrentAsync();
            info = new AccountInfo(user.Login, user.Name ?? user.Login, user.AvatarUrl);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"GitHub-Verbindung fehlgeschlagen: {ex.Message}");
        }

        tokenStore.Save(token);
        return info;
    }

    public void RemoveAccount()
    {
        tokenStore.Delete();
    }
}
