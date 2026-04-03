namespace GhCli.Net.Discussions.GraphQL;

internal class RepositoryNode
{
    public string Id { get; init; } = string.Empty;
    public DiscussionConnection? Discussions { get; init; }
    public CategoryConnection? DiscussionCategories { get; init; }
}
