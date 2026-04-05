using GhCli.Net.Abstractions;
using GhCli.Net.User.Models;
using System.Text.Json;

namespace GhCli.Net.User;

internal class UserClient(IGhCliRunner runner) : IUserClient
{
    private static readonly JsonSerializerOptions JsonOptions = new();

    public async Task<GitHubUser> GetCurrentAsync()
    {
        var json = await runner.RunAsync("api", "user");

        return JsonSerializer.Deserialize<GitHubUser>(json, JsonOptions)
            ?? throw new InvalidOperationException("Aktueller Benutzer konnte nicht abgerufen werden.");
    }

    public async Task<bool> IsAuthenticatedAsync()
    {
        try
        {
            await runner.RunAsync("auth", "status");
            return true;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }
}
