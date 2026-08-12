using System.Diagnostics;
using System.Text;

namespace GithubDashboard;

/// <summary>
/// Shells out to <c>gh api</c> (GitHub CLI) and returns the raw JSON string.
/// Uses the caller's stored gh credentials — no token management required.
/// </summary>
public interface IGhRunner
{
    Task<string> RunApiAsync(string endpoint, bool paginate = false, CancellationToken ct = default);
}

public sealed class GhRunner : IGhRunner
{
    public async Task<string> RunApiAsync(string endpoint, bool paginate = false, CancellationToken ct = default)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "gh",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        psi.ArgumentList.Add("api");
        psi.ArgumentList.Add(endpoint);
        if (paginate) psi.ArgumentList.Add("--paginate");

        using var proc = new Process { StartInfo = psi };
        var stdout = new StringBuilder();
        var stderr = new StringBuilder();

        proc.OutputDataReceived += (_, e) => { if (e.Data != null) stdout.AppendLine(e.Data); };
        proc.ErrorDataReceived  += (_, e) => { if (e.Data != null) stderr.AppendLine(e.Data); };

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        await proc.WaitForExitAsync(ct);

        if (proc.ExitCode != 0)
        {
            var err = stderr.ToString().Trim();
            throw new GhRunnerException($"gh api {endpoint} exited {proc.ExitCode}: {err}");
        }

        return stdout.ToString().Trim();
    }
}

public sealed class GhRunnerException(string message) : Exception(message);
