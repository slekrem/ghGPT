using System.Text.RegularExpressions;

namespace ghGPT.Core.Repositories;

public static class RemoteUrlParser
{
    private static readonly Regex RepoPattern = new(
        @"(?:https://github\.com/|git@github\.com:)([^/]+)/([^/\.]+?)(?:\.git)?$",
        RegexOptions.Compiled);

    public static (string Owner, string Repo) Parse(string remoteUrl)
    {
        var match = RepoPattern.Match(remoteUrl);

        if (!match.Success)
            throw new InvalidOperationException("Dieses Repository ist kein GitHub-Repository.");

        return (match.Groups[1].Value, match.Groups[2].Value);
    }
}
