using GhCli.Net.Abstractions;
using ghGPT.Core.Discussions;

namespace ghGPT.Infrastructure.Discussions;

public class DiscussionService(IDiscussionClient discussionClient) : IDiscussionService
{
    public async Task<IReadOnlyList<DiscussionItem>> GetDiscussionsAsync(string owner, string repo, int limit = 30)
    {
        var discussions = await discussionClient.ListAsync(owner, repo, limit);
        return discussions.Select(Map).ToList();
    }

    public async Task<DiscussionItem> CreateAsync(string owner, string repo, string title, string body, string category = "General")
    {
        var d = await discussionClient.CreateAsync(owner, repo, title, body, category);
        return Map(d);
    }

    private static DiscussionItem Map(GhCli.Net.Discussions.Models.Discussion d) => new()
    {
        Number = d.Number,
        Title = d.Title,
        Body = d.Body,
        Url = d.Url,
        CreatedAt = d.CreatedAt,
        AuthorLogin = d.Author.Login,
        CategoryName = d.Category.Name,
    };
}
