namespace Git.Process.Abstractions;

public interface IGitRunner
{
    Task<string> RunAsync(string workingDirectory, params string[] args);
    Task RunWithInputAsync(string workingDirectory, string input, params string[] args);
    Task RunWithProgressAsync(string workingDirectory, IProgress<string>? progress, params string[] args);
}
