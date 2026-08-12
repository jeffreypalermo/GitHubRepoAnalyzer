import { GITHUB_API_BASE } from './config'
import { cacheGet, cacheSet } from './githubClient.internal'
import type {
  GitHubContributor,
  GitHubCommitSummary,
  GitHubCommitDetail,
  GitHubPullRequest,
  GitHubRateLimit,
  RateLimitInfo,
} from './types'

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function githubFetch<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${res.statusText} (${url})`)
  }
  return res.json() as Promise<T>
}

async function githubFetchCached<T>(
  cacheKey: string,
  url: string,
  token?: string,
): Promise<T> {
  const cached = cacheGet<T>(cacheKey)
  if (cached !== null) return cached
  const data = await githubFetch<T>(url, token)
  cacheSet(cacheKey, data)
  return data
}

// ── Paginated fetch ──────────────────────────────────────────────────────────

async function githubFetchAllPages<T>(
  url: string,
  token?: string,
  maxPages = 10,
): Promise<T[]> {
  const results: T[] = []
  let nextUrl: string | null = `${url}${url.includes('?') ? '&' : '?'}per_page=100`

  for (let page = 0; page < maxPages && nextUrl; page++) {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(nextUrl, { headers })
    if (!res.ok) {
      throw new Error(
        `GitHub API error ${res.status}: ${res.statusText} (${nextUrl})`,
      )
    }
    const pageData = (await res.json()) as T[]
    results.push(...pageData)

    const link = res.headers.get('Link')
    const next = link?.match(/<([^>]+)>;\s*rel="next"/)
    nextUrl = next ? next[1] : null
  }
  return results
}

// ── Public API client ────────────────────────────────────────────────────────

export async function fetchContributorStats(
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubContributor[]> {
  const cacheKey = `contributors:${owner}/${repo}`
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/stats/contributors`
  // GitHub returns 202 while computing — retry up to 3 times after a brief wait
  for (let attempt = 0; attempt < 3; attempt++) {
    const cached = cacheGet<GitHubContributor[]>(cacheKey)
    if (cached) return cached
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(url, { headers })
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 2000))
      continue
    }
    if (!res.ok)
      throw new Error(`GitHub API error ${res.status}: ${res.statusText}`)
    const data = (await res.json()) as GitHubContributor[]
    cacheSet(cacheKey, data)
    return data
  }
  return []
}

export async function fetchCommits(
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubCommitSummary[]> {
  const cacheKey = `commits:${owner}/${repo}`
  const cached = cacheGet<GitHubCommitSummary[]>(cacheKey)
  if (cached) return cached
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits`
  const data = await githubFetchAllPages<GitHubCommitSummary>(url, token)
  cacheSet(cacheKey, data)
  return data
}

export async function fetchCommitDetail(
  owner: string,
  repo: string,
  sha: string,
  token?: string,
): Promise<GitHubCommitDetail> {
  const cacheKey = `commit:${owner}/${repo}/${sha}`
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}`
  return githubFetchCached<GitHubCommitDetail>(cacheKey, url, token)
}

export async function fetchPullRequests(
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubPullRequest[]> {
  const cacheKey = `pulls:${owner}/${repo}`
  const cached = cacheGet<GitHubPullRequest[]>(cacheKey)
  if (cached) return cached
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=closed`
  const data = await githubFetchAllPages<GitHubPullRequest>(url, token)
  cacheSet(cacheKey, data)
  return data
}

export async function fetchRateLimit(token?: string): Promise<RateLimitInfo> {
  const url = `${GITHUB_API_BASE}/rate_limit`
  const data = await githubFetch<GitHubRateLimit>(url, token)
  return {
    limit: data.resources.core.limit,
    remaining: data.resources.core.remaining,
    used: data.resources.core.used,
    resetAt: new Date(data.resources.core.reset * 1000),
  }
}
