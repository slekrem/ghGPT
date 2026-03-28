namespace ghGPT.Api.Models;

public record CloneRepoRequest(string RemoteUrl, string LocalPath);
