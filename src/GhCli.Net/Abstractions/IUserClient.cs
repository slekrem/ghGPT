using GhCli.Net.User.Models;

namespace GhCli.Net.Abstractions;

public interface IUserClient
{
    Task<GitHubUser> GetCurrentAsync();
    Task<bool> IsAuthenticatedAsync();
}
