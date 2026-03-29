using ghGPT.Core.Account;
using Octokit;

namespace ghGPT.Infrastructure.Account;

public class AccountService : IAccountService
{
    private const string GitHubProductHeader = "ghGPT";

    public async Task<AccountInfo?> GetAccountAsync()
    {
        var token = WindowsCredentialManager.Load();
        if (token is null)
            return null;

        try
        {
            return await FetchAccountInfoAsync(token);
        }
        catch
        {
            return null;
        }
    }

    public async Task<AccountInfo> SaveTokenAsync(string token)
    {
        AccountInfo info;
        try
        {
            info = await FetchAccountInfoAsync(token);
        }
        catch (AuthorizationException)
        {
            throw new InvalidOperationException("Der Token ist ungültig oder abgelaufen.");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"GitHub-Verbindung fehlgeschlagen: {ex.Message}");
        }

        WindowsCredentialManager.Save(token);
        return info;
    }

    public void RemoveAccount()
    {
        WindowsCredentialManager.Delete();
    }

    private static async Task<AccountInfo> FetchAccountInfoAsync(string token)
    {
        var client = new GitHubClient(new ProductHeaderValue(GitHubProductHeader))
        {
            Credentials = new Credentials(token)
        };
        var user = await client.User.Current();
        return new AccountInfo(
            Login: user.Login,
            Name: user.Name ?? user.Login,
            AvatarUrl: user.AvatarUrl
        );
    }
}
