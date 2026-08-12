using GithubDashboard;

namespace GithubDashboard.Tests;

public class InputParserTests
{
    // ── plain owner/repo ──────────────────────────────────────────────────────

    [Fact]
    public void Parse_OwnerSlashRepo_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("octocat/Hello-World", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    [Fact]
    public void Parse_OwnerSlashRepo_WithTrailingSlash_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("octocat/Hello-World/", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    // ── full HTTPS URL ─────────────────────────────────────────────────────────

    [Fact]
    public void Parse_HttpsUrl_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("https://github.com/octocat/Hello-World", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    [Fact]
    public void Parse_HttpsUrl_DotGit_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("https://github.com/octocat/Hello-World.git", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    [Fact]
    public void Parse_HttpsUrl_TrailingPathSegments_Succeeds()
    {
        // e.g. URL copied from a branch view
        Assert.True(InputParser.TryParseOwnerRepo("https://github.com/octocat/Hello-World/tree/main", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    [Fact]
    public void Parse_HttpsUrl_TrailingSlash_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("https://github.com/octocat/Hello-World/", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    // ── host-only (no scheme) ─────────────────────────────────────────────────

    [Fact]
    public void Parse_GithubComOwnerRepo_NoScheme_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("github.com/octocat/Hello-World", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    // ── case-insensitive scheme/host ──────────────────────────────────────────

    [Fact]
    public void Parse_UpperCaseSchemeAndHost_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("HTTPS://GITHUB.COM/octocat/Hello-World", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    // ── whitespace tolerance ──────────────────────────────────────────────────

    [Fact]
    public void Parse_LeadingAndTrailingWhitespace_Succeeds()
    {
        Assert.True(InputParser.TryParseOwnerRepo("  octocat/Hello-World  ", out var owner, out var repo));
        Assert.Equal("octocat", owner);
        Assert.Equal("Hello-World", repo);
    }

    // ── invalid inputs ────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("noslash")]
    [InlineData("https://github.com/")]
    [InlineData("https://github.com")]
    public void Parse_InvalidInput_ReturnsFalse(string input)
    {
        Assert.False(InputParser.TryParseOwnerRepo(input, out _, out _));
    }
}
