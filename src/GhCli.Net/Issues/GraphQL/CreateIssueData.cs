using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class CreateIssueData
{
    [JsonPropertyName("createIssue")]
    public CreateIssuePayload? CreateIssue { get; init; }
}
