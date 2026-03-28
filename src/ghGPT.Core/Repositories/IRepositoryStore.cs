namespace ghGPT.Core.Repositories;

public interface IRepositoryStore
{
    IReadOnlyList<RepositoryInfo> Load();
    void Save(IReadOnlyList<RepositoryInfo> repositories);
}
