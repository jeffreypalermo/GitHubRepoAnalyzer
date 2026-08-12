# GH Dashboard

A self-contained terminal dashboard that analyses any public (or private, with `gh` auth) GitHub repository and renders four panels:

| Panel | What it shows |
|---|---|
| **Commits by Contributor** | Total commit count per author, ranked |
| **Most-Changed Files** | File churn hotspots across the last 100 commits |
| **Commit Granularity** | Distribution of commits by number of files touched |
| **Branch-to-Merge Duration** | How long each merged PR took from open → merge |

## Requirements

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated (`gh auth login`)

No GitHub token or environment variables are needed — the tool delegates all API calls to `gh`.

## Usage

### Interactive (TUI prompt)

```
gh-dashboard
```

The tool displays a prompt pre-filled with the example repo. Press **Enter** to accept or type `owner/repo`.

### Non-interactive (command-line argument)

```
gh-dashboard ClearMeasureLabs/bootcamp-palermo-workorders
```

Pass `owner/repo` as the first argument to skip the prompt — useful for scripting or CI.

## Download

Pre-built single-file executables are published on every tagged release under [**Releases**](../../releases):

| Platform | File |
|---|---|
| Windows x64 | `gh-dashboard-win-x64.exe` |
| Linux x64 | `gh-dashboard-linux-x64` |
| macOS x64 | `gh-dashboard-osx-x64` |
| macOS ARM64 | `gh-dashboard-osx-arm64` |

No .NET runtime install required — each binary is fully self-contained.

### macOS / Linux — make executable after download

```bash
chmod +x gh-dashboard-osx-arm64   # or the linux variant
./gh-dashboard-osx-arm64
```

## Build from source

```bash
dotnet build GithubDashboard.Api
dotnet test  GithubDashboard.Tests
```

### Publish a single-file binary locally

```bash
# Windows
dotnet publish GithubDashboard.Api -r win-x64   -c Release -o publish/win-x64

# Linux
dotnet publish GithubDashboard.Api -r linux-x64 -c Release -o publish/linux-x64

# macOS Apple Silicon
dotnet publish GithubDashboard.Api -r osx-arm64 -c Release -o publish/osx-arm64
```

## Release process

Push a version tag to trigger the GitHub Actions release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds all four platform binaries, runs the test suite, and publishes them as release assets automatically.

## Architecture

```
GithubDashboard.Api/
  Program.cs        — top-level: TUI prompt, fetch orchestration, table rendering
  GhRunner.cs       — shells out to `gh api`; injectable interface for testing
  Aggregators.cs    — pure aggregation logic (testable without network)
  Models.cs         — GitHub API JSON shapes + domain result records

GithubDashboard.Tests/
  AggregatorsTests.cs — xUnit unit tests for all four aggregators
```
