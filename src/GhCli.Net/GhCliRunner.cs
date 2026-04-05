using CliWrap;
using CliWrap.Buffered;
using CliWrap.Exceptions;
using GhCli.Net.Abstractions;
using System.ComponentModel;
using System.Text;

namespace GhCli.Net;

internal class GhCliRunner : IGhCliRunner
{
    public async Task<string> RunAsync(params string[] args)
    {
        try
        {
            var result = await Cli.Wrap("gh")
                .WithArguments(args)
                .WithValidation(CommandResultValidation.ZeroExitCode)
                .ExecuteBufferedAsync();

            return result.StandardOutput;
        }
        catch (Win32Exception)
        {
            throw new InvalidOperationException("gh CLI ist nicht installiert oder nicht im PATH.");
        }
        catch (CommandExecutionException ex) when (ex.ExitCode != 0)
        {
            throw new InvalidOperationException($"gh CLI Fehler: {ex.Message}");
        }
    }

    public async Task RunWithInputAsync(string input, params string[] args)
    {
        try
        {
            await Cli.Wrap("gh")
                .WithArguments(args)
                .WithStandardInputPipe(PipeSource.FromString(input, Encoding.UTF8))
                .WithValidation(CommandResultValidation.ZeroExitCode)
                .ExecuteAsync();
        }
        catch (Win32Exception)
        {
            throw new InvalidOperationException("gh CLI ist nicht installiert oder nicht im PATH.");
        }
        catch (CommandExecutionException ex) when (ex.ExitCode != 0)
        {
            throw new InvalidOperationException($"gh CLI Fehler: {ex.Message}");
        }
    }
}
