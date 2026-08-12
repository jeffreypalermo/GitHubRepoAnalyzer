using GithubDashboard;

namespace GithubDashboard.Tests;

public class AggregatorsTests
{
    // ── AggregateContributors ─────────────────────────────────────────────────

    [Fact]
    public void AggregateContributors_SortsDescendingByTotalCommits()
    {
        var raw = new[]
        {
            new GhContributor(new GhContributorAuthor("alice", "https://github.com/alice.png"), 10, []),
            new GhContributor(new GhContributorAuthor("bob",   "https://github.com/bob.png"),   25, []),
        };

        var result = Aggregators.AggregateContributors(raw);

        Assert.Equal(2, result.Count);
        Assert.Equal("bob",   result[0].Login);
        Assert.Equal(25,      result[0].TotalCommits);
        Assert.Equal("alice", result[1].Login);
    }

    [Fact]
    public void AggregateContributors_FiltersNullAuthor()
    {
        var raw = new[]
        {
            new GhContributor(null, 5, []),
            new GhContributor(new GhContributorAuthor("dev", "https://github.com/dev.png"), 1, []),
        };

        var result = Aggregators.AggregateContributors(raw);

        Assert.Single(result);
        Assert.Equal("dev", result[0].Login);
    }

    [Fact]
    public void AggregateContributors_EmptyInput_ReturnsEmpty()
    {
        Assert.Empty(Aggregators.AggregateContributors([]));
    }

    // ── AggregateFileChurn ────────────────────────────────────────────────────

    private static GhCommitDetail MakeDetail(string sha, params string[] filenames) =>
        new(sha,
            new GhCommitInner(new GhCommitAuthorDetail("dev", "2024-01-01T00:00:00Z"), "msg"),
            new GhCommitUserRef("dev"),
            filenames.Select(f => new GhCommitFile(f, 1, 1, 0)).ToArray());

    [Fact]
    public void AggregateFileChurn_CountsAppearancesAcrossCommits()
    {
        var details = new[]
        {
            MakeDetail("a1", "src/App.tsx", "src/index.css"),
            MakeDetail("a2", "src/App.tsx", "src/utils.ts"),
            MakeDetail("a3", "src/App.tsx"),
        };

        var result = Aggregators.AggregateFileChurn(details);

        Assert.Equal("src/App.tsx", result[0].Filename);
        Assert.Equal(3, result[0].ChangeCount);
        Assert.Equal(3, result.Count);
    }

    [Fact]
    public void AggregateFileChurn_EmptyFiles_ReturnsEmpty()
    {
        var result = Aggregators.AggregateFileChurn([MakeDetail("a1")]);
        Assert.Empty(result);
    }

    // ── AggregateGranularity ──────────────────────────────────────────────────

    [Fact]
    public void AggregateGranularity_MapsFilesChangedAndTruncatesMessage()
    {
        var detail = new GhCommitDetail(
            "abc123",
            new GhCommitInner(
                new GhCommitAuthorDetail("dev", "2024-06-01T10:00:00Z"),
                "feat: add stuff\n\nThis is the body"),
            new GhCommitUserRef("dev"),
            [new GhCommitFile("a.ts", 1, 1, 0), new GhCommitFile("b.ts", 2, 2, 0)]);

        var result = Aggregators.AggregateGranularity([detail]);

        Assert.Single(result);
        Assert.Equal(2, result[0].FilesChanged);
        Assert.Equal("dev", result[0].AuthorLogin);
        Assert.Equal("feat: add stuff", result[0].Message);
    }

    [Fact]
    public void AggregateGranularity_NullAuthor_FallsBackToCommitAuthorName()
    {
        var detail = new GhCommitDetail(
            "xyz",
            new GhCommitInner(new GhCommitAuthorDetail("Jane Doe", "2024-01-01T00:00:00Z"), "fix"),
            null,
            []);

        var result = Aggregators.AggregateGranularity([detail]);

        Assert.Equal("Jane Doe", result[0].AuthorLogin);
    }

    // ── AggregateBranchMerge ──────────────────────────────────────────────────

    private static GhPr MakePr(int num, string created, string? merged) =>
        new(num, $"PR #{num}", merged is null ? "open" : "closed", merged, created,
            new GhPrHead($"feature/{num}", "abc"),
            new GhPrBase("main"),
            new GhCommitUserRef("dev"));

    [Fact]
    public void AggregateBranchMerge_ExcludesUnmergedPrs()
    {
        var prs = new[]
        {
            MakePr(1, "2024-01-01T00:00:00Z", "2024-01-01T12:00:00Z"),
            MakePr(2, "2024-01-01T00:00:00Z", null),
        };

        var result = Aggregators.AggregateBranchMerge(prs);

        Assert.Single(result);
        Assert.Equal(1, result[0].PrNumber);
        Assert.Equal(12.0, result[0].DurationHours, precision: 1);
    }

    [Fact]
    public void AggregateBranchMerge_SortsByMergedAtDescending()
    {
        var prs = new[]
        {
            MakePr(1, "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"),
            MakePr(2, "2024-01-03T00:00:00Z", "2024-01-05T00:00:00Z"),
        };

        var result = Aggregators.AggregateBranchMerge(prs);

        Assert.Equal(2, result[0].PrNumber);
    }

    [Fact]
    public void AggregateBranchMerge_AllUnmerged_ReturnsEmpty()
    {
        var result = Aggregators.AggregateBranchMerge(
            [MakePr(1, "2024-01-01T00:00:00Z", null)]);
        Assert.Empty(result);
    }
}
