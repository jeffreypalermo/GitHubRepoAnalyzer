namespace GithubDashboard;

public static class Aggregators
{
    // ── UC1: Commits by contributor ───────────────────────────────────────────

    public static List<ContributorStat> AggregateContributors(IEnumerable<GhContributor> raw) =>
        raw.Where(c => c.Author is not null)
           .Select(c => new ContributorStat(c.Author!.Login, c.Author.AvatarUrl, c.Total))
           .OrderByDescending(c => c.TotalCommits)
           .ToList();

    // ── UC2: Most-changed files ───────────────────────────────────────────────

    public static List<FileStat> AggregateFileChurn(IEnumerable<GhCommitDetail> details)
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var commit in details)
            foreach (var file in commit.Files ?? [])
                counts[file.Filename] = counts.GetValueOrDefault(file.Filename) + 1;

        return counts
            .Select(kv => new FileStat(kv.Key, kv.Value))
            .OrderByDescending(f => f.ChangeCount)
            .ToList();
    }

    // ── UC3: Commit granularity ───────────────────────────────────────────────

    public static List<CommitGranularityStat> AggregateGranularity(IEnumerable<GhCommitDetail> details) =>
        details.Select(c => new CommitGranularityStat(
            c.Sha,
            c.Files?.Length ?? 0,
            c.Author?.Login ?? c.Commit.Author?.Name ?? "unknown",
            c.Commit.Author?.Date ?? string.Empty,
            FirstLine(c.Commit.Message, 72)))
        .ToList();

    // ── UC4: Branch-to-merge duration ─────────────────────────────────────────

    public static List<BranchMergeStat> AggregateBranchMerge(IEnumerable<GhPr> prs) =>
        prs.Where(pr => pr.MergedAt is not null)
           .Select(pr =>
           {
               var start = DateTime.Parse(pr.CreatedAt, null, System.Globalization.DateTimeStyles.RoundtripKind);
               var end   = DateTime.Parse(pr.MergedAt!, null, System.Globalization.DateTimeStyles.RoundtripKind);
               var hours = Math.Max(0, (end - start).TotalHours);
               return new BranchMergeStat(
                   pr.Number,
                   pr.Title,
                   pr.Head.Ref,
                   pr.User?.Login ?? "unknown",
                   pr.CreatedAt,
                   pr.MergedAt!,
                   Math.Round(hours, 2));
           })
           .OrderByDescending(s => DateTime.Parse(s.MergedAt, null, System.Globalization.DateTimeStyles.RoundtripKind))
           .ToList();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string FirstLine(string msg, int maxLen)
    {
        var line = msg.Split('\n')[0];
        return line.Length <= maxLen ? line : line[..maxLen];
    }
}
