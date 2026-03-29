using System.Diagnostics;

namespace ghGPT.Infrastructure.Account;

internal sealed class MacOsTokenStore : ITokenStore
{
    private const string ServiceName = "ghGPT";
    private const string AccountName = "GitHubToken";

    public void Save(string token)
    {
        Run("add-generic-password", $"-s {ServiceName} -a {AccountName} -w \"{token}\" -U");
    }

    public string? Load()
    {
        var (output, exitCode) = Run("find-generic-password", $"-s {ServiceName} -a {AccountName} -w");
        return exitCode == 0 ? output.Trim() : null;
    }

    public void Delete()
    {
        Run("delete-generic-password", $"-s {ServiceName} -a {AccountName}");
    }

    private static (string output, int exitCode) Run(string command, string args)
    {
        var psi = new ProcessStartInfo("security", $"{command} {args}")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        using var process = Process.Start(psi)!;
        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit();
        return (output, process.ExitCode);
    }
}
