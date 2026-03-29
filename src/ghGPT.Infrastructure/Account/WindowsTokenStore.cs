namespace ghGPT.Infrastructure.Account;

internal sealed class WindowsTokenStore : ITokenStore
{
    public void Save(string token) => WindowsCredentialManager.Save(token);
    public string? Load() => WindowsCredentialManager.Load();
    public void Delete() => WindowsCredentialManager.Delete();
}
