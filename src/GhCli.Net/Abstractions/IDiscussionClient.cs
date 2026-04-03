using GhCli.Net.Models.Discussions;

namespace GhCli.Net.Abstractions;

public interface IDiscussionClient
{
    Task<IReadOnlyList<Discussion>> ListAsync(string owner, string repo, int limit = 30);
    Task<Discussion> CreateAsync(string owner, string repo, string title, string body, string category = "General");
}
