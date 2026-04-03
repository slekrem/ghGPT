using GhCli.Net.Discussions.Models;

namespace GhCli.Net.Discussions.GraphQL;

internal class DiscussionConnection
{
    public List<Discussion> Nodes { get; init; } = [];
}
