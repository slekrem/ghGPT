namespace ghGPT.Core.Repositories;

public interface IStashService
{
    IReadOnlyList<StashEntry> GetStashes(string id);
    IReadOnlyList<CommitFileChange> GetStashDiff(string id, int index);
    void PushStash(string id, string? message = null, string[]? paths = null);
    void PopStash(string id, int index = 0);
    void DropStash(string id, int index);
}
