namespace ghGPT.Core.Discussions;

public interface IDiscussionService
{
    Task<IReadOnlyList<DiscussionItem>> GetDiscussionsAsync(string owner, string repo, int limit = 30);
    Task<DiscussionItem> CreateAsync(string owner, string repo, string title, string body, string category = "General");
}
