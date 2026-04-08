using GhCli.Net.Abstractions;
using GhCli.Net.Releases.Models;
using System.Text.Json;

namespace GhCli.Net.Releases;

internal class ReleaseClient(IGhCliRunner runner) : IReleaseClient
{
    private static readonly JsonSerializerOptions JsonOptions = new();

    private const string ListFields = "tagName,name,isDraft,isPrerelease,isLatest,publishedAt";
    private const string DetailFields = "tagName,name,isDraft,isPrerelease,body,publishedAt,url,author";

    public async Task<IReadOnlyList<Release>> ListAsync(string owner, string repo, int limit = 30)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(limit);

        var json = await runner.RunAsync(
            "release", "list",
            "--repo", $"{owner}/{repo}",
            "--limit", limit.ToString(),
            "--json", ListFields);

        return JsonSerializer.Deserialize<List<Release>>(json, JsonOptions) ?? [];
    }

    public async Task<ReleaseDetail> GetLatestAsync(string owner, string repo)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);

        var json = await runner.RunAsync(
            "release", "view",
            "--repo", $"{owner}/{repo}",
            "--json", DetailFields);

        return JsonSerializer.Deserialize<ReleaseDetail>(json, JsonOptions)
            ?? throw new InvalidOperationException("Neuestes Release konnte nicht abgerufen werden.");
    }

    public async Task<ReleaseDetail> GetByTagAsync(string owner, string repo, string tag)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        ArgumentException.ThrowIfNullOrWhiteSpace(repo);
        ArgumentException.ThrowIfNullOrWhiteSpace(tag);

        var json = await runner.RunAsync(
            "release", "view", tag,
            "--repo", $"{owner}/{repo}",
            "--json", DetailFields);

        return JsonSerializer.Deserialize<ReleaseDetail>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Release '{tag}' konnte nicht abgerufen werden.");
    }
}
