using System.ComponentModel;
using System.Diagnostics;

namespace ghGPT.Infrastructure.Repositories;

internal static class GitProcessHelper
{
    public static async Task RunGitOperationAsync(string workingDirectory, string arguments, IProgress<string>? progress)
    {
        progress?.Report($"> git {arguments}");

        var psi = new ProcessStartInfo("git", arguments)
        {
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        psi.Environment["GIT_TERMINAL_PROMPT"] = "0";

        using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        var outputLines = new List<string>();

        void OnOutput(object _, DataReceivedEventArgs args)
        {
            if (string.IsNullOrWhiteSpace(args.Data))
                return;

            var line = args.Data.Trim();
            lock (outputLines)
            {
                outputLines.Add(line);
            }
            progress?.Report(line);
        }

        process.OutputDataReceived += OnOutput;
        process.ErrorDataReceived += OnOutput;

        try
        {
            if (!process.Start())
                throw new InvalidOperationException("Git-Prozess konnte nicht gestartet werden.");

            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            await process.WaitForExitAsync();
        }
        catch (Win32Exception ex)
        {
            throw new InvalidOperationException("Git wurde nicht gefunden oder konnte nicht gestartet werden.", ex);
        }
        finally
        {
            process.OutputDataReceived -= OnOutput;
            process.ErrorDataReceived -= OnOutput;
        }

        if (process.ExitCode == 0)
            return;

        var message = BuildGitOperationError(outputLines);
        throw new InvalidOperationException(message);
    }

    public static void RunGitSync(string workingDirectory, string arguments, string errorPrefix)
    {
        var psi = new ProcessStartInfo("git", arguments)
        {
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException("Git-Prozess konnte nicht gestartet werden.");
        var error = process.StandardError.ReadToEnd();
        process.WaitForExit();
        if (process.ExitCode != 0)
            throw new InvalidOperationException($"{errorPrefix}: {error.Trim()}");
    }

    private static string BuildGitOperationError(IEnumerable<string> outputLines)
    {
        var relevantLines = outputLines
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

        var lines = outputLines.ToList();
        var has403 = lines.Any(line => line.Contains("error: 403", StringComparison.OrdinalIgnoreCase) || line.Contains("returned error: 403", StringComparison.OrdinalIgnoreCase));
        var hasPermissionDenied = lines.Any(line => line.Contains("Permission to", StringComparison.OrdinalIgnoreCase) && line.Contains("denied", StringComparison.OrdinalIgnoreCase));
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

        return relevantLines.LastOrDefault()
            ?? "Git-Operation fehlgeschlagen.";
    }
}
