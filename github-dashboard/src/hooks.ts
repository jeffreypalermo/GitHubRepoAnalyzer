import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchContributorStats,
  fetchCommits,
  fetchCommitDetail,
  fetchPullRequests,
  fetchRateLimit,
} from './githubClient'
import {
  aggregateContributors,
  aggregateFileChurn,
  aggregateGranularity,
  aggregateBranchMerge,
} from './aggregators'
import type {
  GitHubCommitDetail,
  ContributorStat,
  FileStat,
  CommitGranularityStat,
  BranchMergeStat,
  RateLimitInfo,
} from './types'

// Fetch commit details in small batches with a pause between each batch to
// avoid GitHub secondary rate limits (403/429) that fire when many requests
// are issued in parallel without authentication.
async function fetchCommitDetailsBatched(
  owner: string,
  repo: string,
  shas: string[],
  token?: string,
  batchSize = 5,
  delayMs = 800,
): Promise<GitHubCommitDetail[]> {
  const results: GitHubCommitDetail[] = []
  for (let i = 0; i < shas.length; i += batchSize) {
    const chunk = shas.slice(i, i + batchSize)
    const chunkResults = await Promise.all(
      chunk.map((sha) => fetchCommitDetail(owner, repo, sha, token)),
    )
    results.push(...chunkResults)
    if (i + batchSize < shas.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return results
}

export type LoadState = 'idle' | 'loading' | 'done' | 'error'

interface HookResult<T> {
  data: T | null
  state: LoadState
  error: string | null
  reload: () => void
}

function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
): HookResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  // track whether the latest invocation is still current
  const runRef = useRef(0)

  const run = useCallback(() => {
    const id = ++runRef.current
    setState('loading')
    setError(null)
    fn()
      .then((result) => {
        if (id !== runRef.current) return
        setData(result)
        setState('done')
      })
      .catch((err: unknown) => {
        if (id !== runRef.current) return
        setError(err instanceof Error ? err.message : String(err))
        setState('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, state, error, reload: run }
}

// ── Use Case 1 ───────────────────────────────────────────────────────────────

export function useContributorStats(
  owner: string,
  repo: string,
  token?: string,
): HookResult<ContributorStat[]> {
  return useAsync(
    () => fetchContributorStats(owner, repo, token).then(aggregateContributors),
    [owner, repo, token],
  )
}

// ── Use Cases 2 & 3 (shared fetch) ──────────────────────────────────────────

export function useCommitDetails(
  owner: string,
  repo: string,
  token?: string,
  maxCommits = 50,
): HookResult<{ fileStat: FileStat[]; granularity: CommitGranularityStat[] }> {
  return useAsync(async () => {
    const summaries = await fetchCommits(owner, repo, token)
    const batch = summaries.slice(0, maxCommits)
    // Fetch commit details serially in small batches to avoid GitHub secondary
    // rate limits (403/429) that trigger when many requests fire in parallel.
    const details = await fetchCommitDetailsBatched(owner, repo, batch.map((s) => s.sha), token)
    return {
      fileStat: aggregateFileChurn(details),
      granularity: aggregateGranularity(details),
    }
  }, [owner, repo, token, maxCommits])
}

// ── Use Case 4 ───────────────────────────────────────────────────────────────

export function useBranchMerge(
  owner: string,
  repo: string,
  token?: string,
): HookResult<BranchMergeStat[]> {
  return useAsync(
    () => fetchPullRequests(owner, repo, token).then(aggregateBranchMerge),
    [owner, repo, token],
  )
}

// ── Rate limit ───────────────────────────────────────────────────────────────

export function useRateLimit(token?: string): HookResult<RateLimitInfo> {
  return useAsync(() => fetchRateLimit(token), [token])
}
