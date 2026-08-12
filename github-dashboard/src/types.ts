// ── GitHub API shapes ────────────────────────────────────────────────────────

export interface GitHubContributor {
  author: { login: string; avatar_url: string } | null
  total: number
  weeks: Array<{ w: number; a: number; d: number; c: number }>
}

export interface GitHubCommitSummary {
  sha: string
  commit: {
    author: { name: string; date: string } | null
    message: string
  }
  author: { login: string } | null
}

export interface GitHubCommitDetail {
  sha: string
  files: Array<{ filename: string; changes: number }>
  commit: {
    author: { name: string; date: string } | null
    message: string
  }
  author: { login: string } | null
}

export interface GitHubPullRequest {
  number: number
  title: string
  state: string
  merged_at: string | null
  created_at: string
  head: { ref: string; sha: string }
  base: { ref: string }
  user: { login: string } | null
}

export interface GitHubRateLimit {
  resources: {
    core: { limit: number; remaining: number; reset: number; used: number }
  }
}

// ── Aggregated domain types ──────────────────────────────────────────────────

export interface ContributorStat {
  login: string
  avatarUrl: string
  totalCommits: number
}

export interface FileStat {
  filename: string
  changeCount: number
}

export interface CommitGranularityStat {
  sha: string
  filesChanged: number
  authorLogin: string
  date: string
  message: string
}

export interface BranchMergeStat {
  prNumber: number
  title: string
  branchName: string
  authorLogin: string
  firstCommitDate: string
  mergedAt: string
  durationHours: number
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  used: number
  resetAt: Date
}

export interface RepoConfig {
  owner: string
  name: string
}
