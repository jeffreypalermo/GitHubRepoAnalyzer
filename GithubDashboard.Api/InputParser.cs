namespace GithubDashboard;

/// <summary>
/// Parses a user-supplied repository reference into (owner, repo).
/// Accepted forms:
///   owner/repo
///   github.com/owner/repo
///   https://github.com/owner/repo
///   https://github.com/owner/repo.git
///   https://github.com/owner/repo/tree/main   (any trailing path segments ignored)
/// </summary>
public static class InputParser
{
    /// <summary>
    /// Attempts to extract owner and repo from <paramref name="input"/>.
    /// Returns <c>true</c> on success; owner and repo are non-empty strings.
    /// </summary>
    public static bool TryParseOwnerRepo(string input, out string owner, out string repo)
    {
        owner = repo = string.Empty;

        var trimmed = input.Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(trimmed))
            return false;

        // Strip scheme (https:// or http://)
        if (trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed["https://".Length..];
        else if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed["http://".Length..];

        // Strip optional "github.com/" host prefix
        if (trimmed.StartsWith("github.com/", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed["github.com/".Length..];

        // Now expect at least "owner/repo"
        var parts = trimmed.Split('/');
        if (parts.Length < 2 || string.IsNullOrWhiteSpace(parts[0]) || string.IsNullOrWhiteSpace(parts[1]))
            return false;

        owner = parts[0].Trim();
        // Strip trailing .git if present and take only the repo segment
        repo  = parts[1].Trim().TrimEnd(".git".ToCharArray());

        return !string.IsNullOrEmpty(owner) && !string.IsNullOrEmpty(repo);
    }
}
