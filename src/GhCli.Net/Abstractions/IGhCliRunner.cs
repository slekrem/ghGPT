namespace GhCli.Net.Abstractions;

public interface IGhCliRunner
{
    Task<string> RunAsync(params string[] args);
}
