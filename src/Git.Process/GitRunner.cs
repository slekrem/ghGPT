using CliWrap;
using CliWrap.Buffered;
using CliWrap.Exceptions;
using Git.Process.Abstractions;
using System.ComponentModel;
using System.Text;

namespace Git.Process;

internal class GitRunner : IGitRunner
{
    public async Task<string> RunAsync(string workingDirectory, params string[] args)
    {
        try
        {
            var result = await Cli.Wrap("git")
                .WithArguments(args)
                .WithWorkingDirectory(workingDirectory)
                .WithEnvironmentVariables(env => env.Set("GIT_TERMINAL_PROMPT", "0"))
                .WithValidation(CommandResultValidation.ZeroExitCode)
                .ExecuteBufferedAsync();

            return result.StandardOutput;
        }
        catch (Win32Exception)
        {
            throw new InvalidOperationException("git ist nicht installiert oder nicht im PATH.");
        }
        catch (CommandExecutionException ex) when (ex.ExitCode != 0)
        {
            throw new InvalidOperationException($"git Fehler: {ex.Message}");
        }
    }

    public async Task RunWithInputAsync(string workingDirectory, string input, params string[] args)
    {
        try
        {
            await Cli.Wrap("git")
                .WithArguments(args)
                .WithWorkingDirectory(workingDirectory)
                .WithEnvironmentVariables(env => env.Set("GIT_TERMINAL_PROMPT", "0"))
                .WithStandardInputPipe(PipeSource.FromString(input, Encoding.UTF8))
                .WithValidation(CommandResultValidation.ZeroExitCode)
                .ExecuteAsync();
        }
        catch (Win32Exception)
        {
            throw new InvalidOperationException("git ist nicht installiert oder nicht im PATH.");
        }
        catch (CommandExecutionException ex) when (ex.ExitCode != 0)
        {
            throw new InvalidOperationException($"git Fehler: {ex.Message}");
        }
    }

    public async Task RunWithProgressAsync(string workingDirectory, IProgress<string>? progress, params string[] args)
    {
        progress?.Report($"> git {string.Join(' ', args)}");

        var outputLines = new List<string>();
        var stdoutBuffer = new StringBuilder();
        var stderrBuffer = new StringBuilder();

        void Capture(string line)
        {
            if (string.IsNullOrWhiteSpace(line)) return;
            lock (outputLines) outputLines.Add(line.Trim());
            progress?.Report(line.Trim());
        }

        try
        {
            var result = await Cli.Wrap("git")
                .WithArguments(args)
                .WithWorkingDirectory(workingDirectory)
                .WithEnvironmentVariables(env => env.Set("GIT_TERMINAL_PROMPT", "0"))
                .WithStandardOutputPipe(PipeTarget.ToDelegate(Capture))
                .WithStandardErrorPipe(PipeTarget.ToDelegate(Capture))
                .WithValidation(CommandResultValidation.None)
                .ExecuteAsync();

            if (result.ExitCode == 0) return;

            var message = BuildGitOperationError(outputLines);
            throw new InvalidOperationException(message);
        }
        catch (Win32Exception)
        {
            throw new InvalidOperationException("git ist nicht installiert oder nicht im PATH.");
        }
    }

    private static string BuildGitOperationError(IEnumerable<string> outputLines)
    {
        var lines = outputLines.ToList();

        var relevantLines = lines
            .Select(line => line.Trim())
            .Where(line =>
                !string.IsNullOrWhiteSpace(line) &&
                !line.StartsWith("remote:", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("From ", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("Enumerating objects:", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("Counting objects:", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("Compressing objects:", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("Writing objects:", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("Receiving objects:", StringComparison.OrdinalIgnoreCase) &&
                !line.StartsWith("Resolving deltas:", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var mergeConflict = relevantLines.FirstOrDefault(line =>
            line.Contains("CONFLICT", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("Automatic merge failed", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("Automatischer Merge fehlgeschlagen", StringComparison.OrdinalIgnoreCase));
        if (mergeConflict is not null)
            return $"Merge-Konflikt beim Aktualisieren des Branches. {mergeConflict}";

        var has403 = lines.Any(line =>
            line.Contains("error: 403", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("returned error: 403", StringComparison.OrdinalIgnoreCase));
        var hasPermissionDenied = lines.Any(line =>
            line.Contains("Permission to", StringComparison.OrdinalIgnoreCase) &&
            line.Contains("denied", StringComparison.OrdinalIgnoreCase));
        if (has403 || hasPermissionDenied)
            return "Push fehlgeschlagen (403): Der hinterlegte GitHub-Token hat keine Schreibberechtigung. Bitte stelle sicher, dass der PAT die Berechtigung 'Contents: Write' (Fine-grained) bzw. den Scope 'repo' (Classic) besitzt.";

        var authError = relevantLines.FirstOrDefault(line =>
            line.Contains("Authentication failed", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("could not read Username", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("Permission denied", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("Repository not found", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("fatal: could not", StringComparison.OrdinalIgnoreCase));
        if (authError is not null)
            return $"Authentifizierung oder Remote-Zugriff fehlgeschlagen. {authError}";

        return relevantLines.LastOrDefault() ?? "Git-Operation fehlgeschlagen.";
    }
}
