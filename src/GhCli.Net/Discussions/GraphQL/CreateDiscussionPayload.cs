using GhCli.Net.Discussions.Models;

namespace GhCli.Net.Discussions.GraphQL;

internal class CreateDiscussionPayload
{
    public Discussion? Discussion { get; init; }
}
