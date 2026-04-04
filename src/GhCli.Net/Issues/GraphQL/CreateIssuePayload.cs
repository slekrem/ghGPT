using GhCli.Net.Issues.Models;
using System.Text.Json.Serialization;

namespace GhCli.Net.Issues.GraphQL;

internal class CreateIssuePayload
{
    [JsonPropertyName("issue")]
    public Issue? Issue { get; init; }
}
