namespace ghGPT.Infrastructure.Account;

public interface ITokenStore
{
    void Save(string token);
    string? Load();
    void Delete();
}
