namespace GithubDashboard;

// ── GitHub CLI / API response shapes ─────────────────────────────────────────
// These mirror the JSON structures returned by `gh api`.

public record GhContributorWeek(long W, int A, int D, int C);

public record GhContributorAuthor(string Login, string AvatarUrl);

public record GhContributor(GhContributorAuthor? Author, int Total, GhContributorWeek[] Weeks);

public record GhCommitAuthorDetail(string? Name, string? Date);

public record GhCommitInner(GhCommitAuthorDetail? Author, string Message);

public record GhCommitUserRef(string Login);

public record GhCommitFile(string Filename, int Changes, int Additions, int Deletions);

public record GhCommitDetail(
    string Sha,
    GhCommitInner Commit,
    GhCommitUserRef? Author,
    GhCommitFile[]? Files);

public record GhPrHead(string Ref, string Sha);

public record GhPrBase(string Ref);

public record GhPr(
    int Number,
    string Title,
    string State,
    string? MergedAt,
    string CreatedAt,
    GhPrHead Head,
    GhPrBase Base,
    GhCommitUserRef? User);

// ── API response DTOs sent to the React frontend ─────────────────────────────

public record ContributorStat(string Login, string AvatarUrl, int TotalCommits);

public record FileStat(string Filename, int ChangeCount);

public record CommitGranularityStat(
    string Sha,
    int FilesChanged,
    string AuthorLogin,
    string Date,
    string Message);

public record BranchMergeStat(
    int PrNumber,
    string Title,
    string BranchName,
    string AuthorLogin,
    string FirstCommitDate,
    string MergedAt,
    double DurationHours);
