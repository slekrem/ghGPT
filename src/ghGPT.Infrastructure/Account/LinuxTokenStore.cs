using System.Runtime.Versioning;

namespace ghGPT.Infrastructure.Account;

[UnsupportedOSPlatform("windows")]
[UnsupportedOSPlatform("osx")]
internal sealed class LinuxTokenStore : ITokenStore
{
    private static readonly string TokenFilePath =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ghGPT", "token");

    public void Save(string token)
    {
        var directory = Path.GetDirectoryName(TokenFilePath)!;
        Directory.CreateDirectory(directory);
        File.WriteAllText(TokenFilePath, token);
        File.SetUnixFileMode(TokenFilePath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
    }

    public string? Load()
    {
        if (!File.Exists(TokenFilePath))
            return null;

        var token = File.ReadAllText(TokenFilePath).Trim();
        return string.IsNullOrEmpty(token) ? null : token;
    }

    public void Delete()
    {
        if (File.Exists(TokenFilePath))
            File.Delete(TokenFilePath);
    }
}
