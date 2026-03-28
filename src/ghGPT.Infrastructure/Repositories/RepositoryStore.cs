using System.Text.Json;
using ghGPT.Core.Repositories;
using Microsoft.Extensions.Configuration;

namespace ghGPT.Infrastructure.Repositories;

public class RepositoryStore : IRepositoryStore
{
    private readonly string _filePath;

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public RepositoryStore(IConfiguration configuration)
    {
        var basePath = configuration["ghGPT:RepositoriesPath"];
        if (string.IsNullOrWhiteSpace(basePath))
            basePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".ghgpt");

        Directory.CreateDirectory(basePath);
        _filePath = Path.Combine(basePath, "repositories.json");
    }

    public IReadOnlyList<RepositoryInfo> Load()
    {
        if (!File.Exists(_filePath))
            return [];

        var json = File.ReadAllText(_filePath);
        return JsonSerializer.Deserialize<List<RepositoryInfo>>(json, JsonOptions) ?? [];
    }

    public void Save(IReadOnlyList<RepositoryInfo> repositories)
    {
        var json = JsonSerializer.Serialize(repositories, JsonOptions);
        File.WriteAllText(_filePath, json);
    }
}
