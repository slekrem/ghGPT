namespace GhCli.Net.Abstractions;

public interface IGhCliRunner
{
    Task<string> RunAsync(params string[] args);
    Task RunWithInputAsync(string input, params string[] args);
}
