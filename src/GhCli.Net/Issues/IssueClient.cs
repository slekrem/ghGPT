using GhCli.Net.Abstractions;
using GhCli.Net.GraphQL;
using GhCli.Net.Issues.GraphQL;
using GhCli.Net.Issues.Models;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GhCli.Net.Issues;

internal class IssueClient(IGhCliRunner runner) : IIssueClient
{
    private static readonly JsonSerializerOptions JsonOptions = new();

    private const string ListFields = "number,title,state,author,labels,assignees,createdAt,updatedAt,url";
    private const string DetailFields = "number,title,state,author,labels,assignees,body,createdAt,updatedAt,url";

    private const string RepoMetaQuery = """
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            id
            labels(first: 100) {
              nodes { id name }
            }
          }
        }
        """;

    private const string LinkedBranchQuery = """
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $number) {
              number title state url body createdAt updatedAt
              author { login }
              labels(first: 25) { nodes { name color } }
              assignees(first: 25) { nodes { login } }
              linkedBranches(first: 10) { nodes { ref { name } } }
            }
          }
        }
        """;

    private const string CreateMutation = """
        mutation($repoId: ID!, $title: String!, $body: String!, $labelIds: [ID!]) {
          createIssue(input: {
            repositoryId: $repoId
            title: $title
            body: $body
            labelIds: $labelIds
          }) {
            issue {
              number title state url createdAt updatedAt
              author { login }
              labels(first: 25) { nodes { id name color description } }
              assignees(first: 25) { nodes { login } }
            }
          }
        }
        """;

    public async Task<IReadOnlyList<Issue>> ListAsync(string owner, string repo, string state = "open", int limit = 30)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentException.ThrowIfNullOrWhiteSpace(state);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(limit);

        var json = await runner.RunAsync(
            "issue", "list",
            "--repo", $"{owner}/{repo}",
            "--state", state,
            "--limit", limit.ToString(),
            "--json", ListFields);

        return JsonSerializer.Deserialize<List<Issue>>(json, JsonOptions) ?? [];
    }

    public async Task<IssueDetail> GetDetailAsync(string owner, string repo, int number)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(number);

        var json = await runner.RunAsync(
            "issue", "view", number.ToString(),
            "--repo", $"{owner}/{repo}",
            "--json", DetailFields);

        return JsonSerializer.Deserialize<IssueDetail>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Issue #{number} konnte nicht abgerufen werden.");
    }

    public async Task<IssueDetail?> GetLinkedIssueForBranchAsync(string owner, string repo, string branchName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentException.ThrowIfNullOrWhiteSpace(branchName);

        var match = Regex.Match(branchName, @"^(\d+)-");
        if (!match.Success)
            return null;

        var number = int.Parse(match.Groups[1].Value);

        var json = await runner.RunAsync(
            "api", "graphql",
            "-f", $"query={LinkedBranchQuery}",
            "-f", $"owner={owner}",
            "-f", $"repo={repo}",
            "-F", $"number={number}");

        var response = JsonSerializer.Deserialize<GraphQlResponse<LinkedBranchQueryData>>(json, JsonOptions);
        var issue = response?.Data?.Repository?.Issue;

        if (issue is null)
            return null;

        var isLinked = issue.LinkedBranches?.Nodes
            .Any(n => string.Equals(n.Ref?.Name, branchName, StringComparison.OrdinalIgnoreCase)) ?? false;

        if (!isLinked)
            return null;

        return new IssueDetail
        {
            Number = issue.Number,
            Title = issue.Title,
            State = issue.State,
            Url = issue.Url,
            Body = issue.Body,
            CreatedAt = issue.CreatedAt,
            UpdatedAt = issue.UpdatedAt,
            Author = new IssueAuthor { Login = issue.Author?.Login ?? string.Empty },
            Labels = issue.Labels?.Nodes
                .Select(l => new IssueLabel { Name = l.Name, Color = l.Color })
                .ToList() ?? [],
            Assignees = issue.Assignees?.Nodes
                .Select(a => new IssueAssignee { Login = a.Login })
                .ToList() ?? [],
        };
    }

    public async Task<Issue> CreateAsync(string owner, string repo, string title, string body, IEnumerable<string>? labels = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(body);

        var repoJson = await runner.RunAsync(
            "api", "graphql",
            "-f", $"query={RepoMetaQuery}",
            "-f", $"owner={owner}",
            "-f", $"repo={repo}");

        var repoResponse = JsonSerializer.Deserialize<GraphQlResponse<IssueRepositoryData>>(repoJson, JsonOptions)
            ?? throw new InvalidOperationException("Ungültige Antwort von der GraphQL-API.");

        if (repoResponse.HasErrors)
            throw new InvalidOperationException($"GraphQL-Fehler: {string.Join(", ", repoResponse.Errors!.Select(e => e.Message))}");

        var repoId = repoResponse.Data?.Repository?.Id
            ?? throw new InvalidOperationException("Repository nicht gefunden.");

        var labelIds = ResolveLabels(repoResponse.Data?.Repository?.Labels?.Nodes, labels);

        var args = new List<string>
        {
            "api", "graphql",
            "-f", $"query={CreateMutation}",
            "-F", $"repoId={repoId}",
            "-f", $"title={title}",
            "-f", $"body={body}"
        };

        foreach (var labelId in labelIds)
            args.AddRange(["-f", $"labelIds[]={labelId}"]);

        var resultJson = await runner.RunAsync([.. args]);

        var result = JsonSerializer.Deserialize<GraphQlResponse<CreateIssueData>>(resultJson, JsonOptions)
            ?? throw new InvalidOperationException("Ungültige Antwort von der GraphQL-API.");

        if (result.HasErrors)
            throw new InvalidOperationException($"GraphQL-Fehler: {string.Join(", ", result.Errors!.Select(e => e.Message))}");

        return result.Data?.CreateIssue?.Issue
            ?? throw new InvalidOperationException("Issue konnte nicht erstellt werden.");
    }

    public async Task AddCommentAsync(string owner, string repo, int number, string body)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(number);
        ArgumentException.ThrowIfNullOrWhiteSpace(body);

        await runner.RunAsync(
            "issue", "comment", number.ToString(),
            "--repo", $"{owner}/{repo}",
            "--body", body);
    }

    private static IReadOnlyList<string> ResolveLabels(
        IReadOnlyList<IssueLabelNode>? availableLabels,
        IEnumerable<string>? requestedLabels)
    {
        if (requestedLabels is null || availableLabels is null)
            return [];

        return requestedLabels
            .Select(name => availableLabels.FirstOrDefault(l =>
                l.Name.Equals(name, StringComparison.OrdinalIgnoreCase))?.Id)
            .Where(id => id is not null)
            .Cast<string>()
            .ToList();
    }
}
