import type {
  GitHubContributor,
  GitHubCommitDetail,
  GitHubPullRequest,
  ContributorStat,
  FileStat,
  CommitGranularityStat,
  BranchMergeStat,
} from './types'

// ── Use Case 1: Commits by user ──────────────────────────────────────────────

export function aggregateContributors(
  raw: GitHubContributor[],
): ContributorStat[] {
  return raw
    .filter((c) => c.author !== null)
    .map((c) => ({
      login: c.author!.login,
      avatarUrl: c.author!.avatar_url,
      totalCommits: c.total,
    }))
    .sort((a, b) => b.totalCommits - a.totalCommits)
}

// ── Use Case 2: Most-changed files ──────────────────────────────────────────

export function aggregateFileChurn(details: GitHubCommitDetail[]): FileStat[] {
  const counts = new Map<string, number>()
  for (const commit of details) {
    for (const file of commit.files ?? []) {
      counts.set(file.filename, (counts.get(file.filename) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([filename, changeCount]) => ({ filename, changeCount }))
    .sort((a, b) => b.changeCount - a.changeCount)
}

// ── Use Case 3: Commit granularity ──────────────────────────────────────────

export function aggregateGranularity(
  details: GitHubCommitDetail[],
): CommitGranularityStat[] {
  return details.map((c) => ({
    sha: c.sha,
    filesChanged: c.files?.length ?? 0,
    authorLogin: c.author?.login ?? c.commit.author?.name ?? 'unknown',
    date: c.commit.author?.date ?? '',
    message: c.commit.message.split('\n')[0].slice(0, 72),
  }))
}

// ── Use Case 4: Branch-to-merge duration ────────────────────────────────────

/**
 * For each merged PR we have `created_at` (when the PR was opened) and
 * `merged_at`. We use PR created_at as a reliable proxy for branch activity
 * start because the per-commit detail calls needed for the first-commit-on-branch
 * approach would consume the entire unauthenticated rate budget.
 *
 * If a GitHub token is supplied upstream, callers can enrich this with the
 * actual first commit date via fetchCommitsForBranch.
 */
export function aggregateBranchMerge(
  prs: GitHubPullRequest[],
): BranchMergeStat[] {
  return prs
    .filter((pr) => pr.merged_at !== null)
    .map((pr) => {
      const start = new Date(pr.created_at)
      const end = new Date(pr.merged_at!)
      const durationHours = Math.max(
        0,
        (end.getTime() - start.getTime()) / (1000 * 60 * 60),
      )
      return {
        prNumber: pr.number,
        title: pr.title,
        branchName: pr.head.ref,
        authorLogin: pr.user?.login ?? 'unknown',
        firstCommitDate: pr.created_at,
        mergedAt: pr.merged_at!,
        durationHours,
      }
    })
    .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime())
}
