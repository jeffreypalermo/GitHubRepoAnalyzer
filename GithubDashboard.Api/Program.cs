using System.Text.Json;
using GithubDashboard;
using Spectre.Console;

// ── Repo target ───────────────────────────────────────────────────────────────

string owner;
string repo;

AnsiConsole.Write(new FigletText("GH Dashboard").Color(Color.SteelBlue1));

// Command-line argument: gh-dashboard owner/repo
if (args.Length == 1 && args[0].Contains('/'))
{
    var parts = args[0].Split('/', 2);
    owner = parts[0];
    repo  = parts[1];
}
else
{
    // TUI prompt — pre-filled with the example repo
    var input = AnsiConsole.Prompt(
        new TextPrompt<string>("[grey]Enter[/] [steelblue1]owner/repo[/]")
            .DefaultValue("ClearMeasureLabs/bootcamp-palermo-workorders")
            .Validate(v =>
                v.Contains('/')
                    ? ValidationResult.Success()
                    : ValidationResult.Error("[red]Must be in owner/repo format[/]")));

    var parts = input.Split('/', 2);
    owner = parts[0];
    repo  = parts[1];
}

var ct = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; ct.Cancel(); };

AnsiConsole.MarkupLine($"[grey]Repository:[/] [bold steelblue1]{owner}/{repo}[/]\n");

var gh = new GhRunner();

// ── JSON helpers ──────────────────────────────────────────────────────────────

var _jsonOpts = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower,
};

// gh --paginate concatenates pages as adjacent JSON arrays: [...]\n[...]
// Also handles a single JSON array or a single JSON object (empty/error body).
List<T> DeserializePaginated<T>(string json)
{
    var all = new List<T>();
    var trimmed = json.Trim();

    // Wrap adjacent arrays into an outer array so we can parse in one pass
    var wrapped = "[" + trimmed.Replace("]\n[", "],[").Replace("]\r\n[", "],[") + "]";
    using var doc = JsonDocument.Parse(wrapped);

    foreach (var page in doc.RootElement.EnumerateArray())
    {
        // Each page is either an array of items or a single object
        if (page.ValueKind == JsonValueKind.Array)
            foreach (var item in page.EnumerateArray())
                all.Add(JsonSerializer.Deserialize<T>(item.GetRawText(), _jsonOpts)!);
        else if (page.ValueKind == JsonValueKind.Object)
        {
            // Single object — deserialize as T directly if it looks populated
            var obj = JsonSerializer.Deserialize<T>(page.GetRawText(), _jsonOpts);
            if (obj is not null) all.Add(obj);
        }
    }
    return all;
}

// ── Fetch all data with a live progress display ───────────────────────────────

List<ContributorStat>?     contributors = null;
List<FileStat>?            fileStats    = null;
List<CommitGranularityStat>? granularity = null;
List<BranchMergeStat>?     branchMerge  = null;
string? fetchError = null;

await AnsiConsole.Progress()
    .AutoRefresh(true)
    .AutoClear(false)
    .Columns(
        new TaskDescriptionColumn(),
        new ProgressBarColumn(),
        new SpinnerColumn())
    .StartAsync(async ctx =>
    {
        var t1 = ctx.AddTask("[steelblue1]Contributors[/]",      maxValue: 1);
        var t2 = ctx.AddTask("[steelblue1]Commit list[/]",       maxValue: 1);
        var t3 = ctx.AddTask("[steelblue1]Commit details[/]",    maxValue: 1);
        var t4 = ctx.AddTask("[steelblue1]Pull requests[/]",     maxValue: 1);

        try
        {
            // UC1 — contributors
            t1.StartTask();
            var contribJson = await gh.RunApiAsync(
                $"repos/{owner}/{repo}/stats/contributors", paginate: false, ct.Token);
            var raw = DeserializePaginated<GhContributor>(contribJson);
            contributors = Aggregators.AggregateContributors(raw);
            t1.Increment(1);

            // UC2+3 — commit list then per-commit details
            t2.StartTask();
            var summaryJson = await gh.RunApiAsync(
                $"repos/{owner}/{repo}/commits?per_page=100", paginate: true, ct.Token);
            var summaries = DeserializePaginated<GhCommitDetail>(summaryJson);
            t2.Increment(1);

            t3.StartTask();
            t3.MaxValue = Math.Min(summaries.Count, 100);
            var details = new List<GhCommitDetail>(summaries.Count);
            foreach (var s in summaries.Take(100))
            {
                ct.Token.ThrowIfCancellationRequested();
                try
                {
                    // Single-object endpoint — do NOT paginate
                    var detailJson = await gh.RunApiAsync(
                        $"repos/{owner}/{repo}/commits/{s.Sha}", paginate: false, ct.Token);
                    var d = JsonSerializer.Deserialize<GhCommitDetail>(detailJson, _jsonOpts);
                    if (d is not null) details.Add(d);
                }
                catch (GhRunnerException) { /* skip failed SHA */ }
                t3.Increment(1);
            }
            fileStats   = Aggregators.AggregateFileChurn(details);
            granularity = Aggregators.AggregateGranularity(details);

            // UC4 — pull requests
            t4.StartTask();
            var prJson = await gh.RunApiAsync(
                $"repos/{owner}/{repo}/pulls?state=closed&per_page=100", paginate: true, ct.Token);
            var prs = DeserializePaginated<GhPr>(prJson);
            branchMerge = Aggregators.AggregateBranchMerge(prs);
            t4.Increment(1);
        }
        catch (OperationCanceledException)
        {
            fetchError = "Cancelled.";
        }
        catch (GhRunnerException ex)
        {
            fetchError = ex.Message;
        }
    });

if (fetchError is not null)
{
    AnsiConsole.MarkupLine($"\n[red]Error:[/] {Markup.Escape(fetchError)}");
    return 1;
}

// ── Render panels ─────────────────────────────────────────────────────────────

AnsiConsole.WriteLine();

// ── UC1: Commits by contributor ───────────────────────────────────────────────

var contribTable = new Table()
    .Title("[bold]Commits by Contributor[/]")
    .Border(TableBorder.Rounded)
    .BorderColor(Color.SteelBlue1)
    .AddColumn(new TableColumn("#").RightAligned())
    .AddColumn("Contributor")
    .AddColumn(new TableColumn("Commits").RightAligned())
    .AddColumn("[grey]Bar[/]");

int maxCommits = contributors!.Count > 0 ? contributors[0].TotalCommits : 1;
for (int i = 0; i < Math.Min(contributors.Count, 20); i++)
{
    var c = contributors[i];
    int barLen = (int)Math.Round((double)c.TotalCommits / maxCommits * 30);
    var bar = new string('█', barLen).PadRight(30);
    contribTable.AddRow(
        $"[grey]{i + 1}[/]",
        $"[bold]{Markup.Escape(c.Login)}[/]",
        $"[steelblue1]{c.TotalCommits:N0}[/]",
        $"[steelblue1]{bar}[/]");
}
AnsiConsole.Write(contribTable);
AnsiConsole.WriteLine();

// ── UC2: Most-changed files ───────────────────────────────────────────────────

var filesTable = new Table()
    .Title("[bold]Most-Changed Files[/]")
    .Border(TableBorder.Rounded)
    .BorderColor(Color.IndianRed1)
    .AddColumn(new TableColumn("#").RightAligned())
    .AddColumn("File")
    .AddColumn(new TableColumn("Changes").RightAligned())
    .AddColumn("[grey]Churn[/]");

int maxChurn = fileStats!.Count > 0 ? fileStats[0].ChangeCount : 1;
for (int i = 0; i < Math.Min(fileStats.Count, 20); i++)
{
    var f = fileStats[i];
    int barLen = (int)Math.Round((double)f.ChangeCount / maxChurn * 30);
    var bar    = new string('█', barLen).PadRight(30);
    bool hotspot = f.ChangeCount >= maxChurn * 0.6 && i > 0;
    var filenameCell = hotspot
        ? $"[yellow]{Markup.Escape(f.Filename)}[/] [yellow]⚠[/]"
        : Markup.Escape(f.Filename);
    filesTable.AddRow(
        $"[grey]{i + 1}[/]",
        filenameCell,
        $"[indianred1]{f.ChangeCount}×[/]",
        $"[indianred1]{bar}[/]");
}
AnsiConsole.Write(filesTable);
AnsiConsole.WriteLine();

// ── UC3: Commit granularity ───────────────────────────────────────────────────

static string BucketLabel(int n) => n switch
{
    <= 1  => "1 file   ",
    <= 3  => "2–3 files",
    <= 10 => "4–10 files",
    <= 30 => "11–30 files",
    _     => "31+ files  ",
};
static Color BucketColor(int n) => n switch
{
    <= 1  => Color.Green,
    <= 3  => Color.GreenYellow,
    <= 10 => Color.Yellow,
    <= 30 => Color.Orange1,
    _     => Color.Red,
};

var granularityTable = new Table()
    .Title("[bold]Commit Granularity[/]")
    .Border(TableBorder.Rounded)
    .BorderColor(Color.Yellow)
    .AddColumn("Bucket")
    .AddColumn(new TableColumn("Count").RightAligned())
    .AddColumn("[grey]Distribution[/]");

var buckets = granularity!
    .GroupBy(g => BucketLabel(g.FilesChanged))
    .ToDictionary(g => g.Key, g => g.Count());

var bucketOrder = new[] { "1 file   ", "2–3 files", "4–10 files", "11–30 files", "31+ files  " };
int totalCommits = granularity!.Count;
foreach (var label in bucketOrder)
{
    int count = buckets.GetValueOrDefault(label);
    int pct   = totalCommits > 0 ? (int)Math.Round((double)count / totalCommits * 100) : 0;
    int barLen = (int)Math.Round((double)count / (totalCommits > 0 ? totalCommits : 1) * 40);
    var bar   = new string('█', barLen);
    // map label back to a representative file count for colour
    int sampleN = label.StartsWith("11") ? 20 : label.StartsWith("1") ? 1 :
                  label.StartsWith("2") ? 2 : label.StartsWith("4") ? 5 : 40;
    var col = BucketColor(sampleN);
    granularityTable.AddRow(
        $"[{col}]{Markup.Escape(label.Trim())}[/]",
        $"{count} ({pct}%)",
        $"[{col}]{bar}[/]");
}

double avgFiles = totalCommits > 0 ? granularity.Average(g => g.FilesChanged) : 0;
int focusedCount = granularity.Count(g => g.FilesChanged <= 3);
double focusedPct = totalCommits > 0 ? (double)focusedCount / totalCommits * 100 : 0;

granularityTable.Caption(
    $"[grey]{totalCommits} commits · avg {avgFiles:F1} files/commit · " +
    $"{focusedPct:F0}% focused (≤3 files)[/]");
AnsiConsole.Write(granularityTable);
AnsiConsole.WriteLine();

// ── UC4: Branch-to-merge duration ────────────────────────────────────────────

static string FormatDuration(double h) =>
    h < 1   ? $"{h * 60:F0}m" :
    h < 24  ? $"{h:F1}h" :
              $"{h / 24:F1}d";

static Color DurationColor(double h) =>
    h <= 24  ? Color.Green :
    h <= 72  ? Color.Yellow :
    h <= 168 ? Color.Orange1 :
               Color.Red;

var prTable = new Table()
    .Title("[bold]Branch-to-Merge Duration[/]")
    .Border(TableBorder.Rounded)
    .BorderColor(Color.Green)
    .AddColumn(new TableColumn("PR").RightAligned())
    .AddColumn("Title")
    .AddColumn("Author")
    .AddColumn(new TableColumn("Duration").RightAligned())
    .AddColumn("[grey]Bar[/]");

double maxDuration = branchMerge!.Count > 0
    ? branchMerge.Max(s => s.DurationHours) : 1;
double avgDuration = branchMerge.Count > 0
    ? branchMerge.Average(s => s.DurationHours) : 0;
int within24h = branchMerge.Count(s => s.DurationHours <= 24);
double within24Pct = branchMerge.Count > 0
    ? (double)within24h / branchMerge.Count * 100 : 0;

foreach (var s in branchMerge.Take(25))
{
    int barLen = maxDuration > 0
        ? (int)Math.Round(s.DurationHours / maxDuration * 30)
        : 0;
    barLen = Math.Max(barLen, 1);
    var bar = new string('█', barLen).PadRight(30);
    var col = DurationColor(s.DurationHours);
    prTable.AddRow(
        $"[grey]#{s.PrNumber}[/]",
        Markup.Escape(s.Title.Length > 55 ? s.Title[..52] + "…" : s.Title),
        $"[grey]{Markup.Escape(s.AuthorLogin)}[/]",
        $"[{col}]{FormatDuration(s.DurationHours)}[/]",
        $"[{col}]{bar}[/]");
}

prTable.Caption(
    $"[grey]{branchMerge.Count} merged PRs · avg {FormatDuration(avgDuration)} · " +
    $"{within24Pct:F0}% within 24h[/]");
AnsiConsole.Write(prTable);
AnsiConsole.WriteLine();

return 0;
