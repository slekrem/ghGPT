namespace ghGPT.Core.Repositories;

public interface IStagingService
{
    void StageFile(string id, string filePath);
    void UnstageFile(string id, string filePath);
    void StageAll(string id);
    void UnstageAll(string id);
    void StageLines(string id, string filePath, string patch);
    void UnstageLines(string id, string filePath, string patch);
    void DiscardFile(string id, string filePath);
    void DiscardLines(string id, string filePath, string patch);
}
