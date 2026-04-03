using GhCli.Net.Abstractions;
using GhCli.Net.Discussions.GraphQL;
using GhCli.Net.Discussions.Models;
using GhCli.Net.GraphQL;
using System.Text.Json;

namespace GhCli.Net.Discussions;

internal class DiscussionClient(IGhCliRunner runner) : IDiscussionClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string ListQuery = """
        query($owner: String!, $repo: String!, $limit: Int!) {
          repository(owner: $owner, name: $repo) {
            discussions(first: $limit) {
              nodes {
                number title body url createdAt
                author { login }
                category { name }
              }
            }
          }
        }
        """;

    private const string RepoMetaQuery = """
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            id
            discussionCategories(first: 25) {
              nodes { id name }
            }
          }
        }
        """;

    private const string CreateMutation = """
        mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
          createDiscussion(input: {
            repositoryId: $repoId
            categoryId: $categoryId
            title: $title
            body: $body
          }) {
            discussion {
              number title body url createdAt
              author { login }
              category { name }
            }
          }
        }
        """;

    public async Task<IReadOnlyList<Discussion>> ListAsync(string owner, string repo, int limit = 30)
    {
        var json = await runner.RunAsync(
            "api", "graphql",
            "-f", $"query={ListQuery}",
            "-f", $"owner={owner}",
            "-f", $"repo={repo}",
            "-F", $"limit={limit}");

        var response = JsonSerializer.Deserialize<GraphQlResponse<RepositoryData>>(json, JsonOptions);
        return response?.Data?.Repository?.Discussions?.Nodes ?? [];
    }

    public async Task<Discussion> CreateAsync(string owner, string repo, string title, string body, string category = "General")
    {
        var repoJson = await runner.RunAsync(
            "api", "graphql",
            "-f", $"query={RepoMetaQuery}",
            "-f", $"owner={owner}",
            "-f", $"repo={repo}");

        var repoResponse = JsonSerializer.Deserialize<GraphQlResponse<RepositoryData>>(repoJson, JsonOptions);

        var repoId = repoResponse?.Data?.Repository?.Id
            ?? throw new InvalidOperationException("Repository nicht gefunden.");

        var categoryId = repoResponse?.Data?.Repository?.DiscussionCategories?.Nodes
            .FirstOrDefault(c => c.Name.Equals(category, StringComparison.OrdinalIgnoreCase))?.Id
            ?? throw new InvalidOperationException($"Kategorie '{category}' nicht gefunden.");

        var resultJson = await runner.RunAsync(
            "api", "graphql",
            "-f", $"query={CreateMutation}",
            "-F", $"repoId={repoId}",
            "-F", $"categoryId={categoryId}",
            "-f", $"title={title}",
            "-f", $"body={body}");

        var result = JsonSerializer.Deserialize<GraphQlResponse<CreateDiscussionData>>(resultJson, JsonOptions);
        return result?.Data?.CreateDiscussion?.Discussion
            ?? throw new InvalidOperationException("Discussion konnte nicht erstellt werden.");
    }
}
