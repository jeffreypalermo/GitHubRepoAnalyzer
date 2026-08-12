import { describe, it, expect } from 'vitest'
import {
  aggregateContributors,
  aggregateFileChurn,
  aggregateGranularity,
  aggregateBranchMerge,
} from '../aggregators'
import type {
  GitHubContributor,
  GitHubCommitDetail,
  GitHubPullRequest,
} from '../types'

// ── aggregateContributors ────────────────────────────────────────────────────

describe('aggregateContributors', () => {
  it('maps raw contributors to ContributorStat and sorts descending', () => {
    const raw: GitHubContributor[] = [
      { author: { login: 'alice', avatar_url: 'https://a.com/alice.png' }, total: 10, weeks: [] },
      { author: { login: 'bob', avatar_url: 'https://a.com/bob.png' }, total: 25, weeks: [] },
      { author: null, total: 5, weeks: [] }, // null author — should be filtered out
    ]
    const result = aggregateContributors(raw)
    expect(result).toHaveLength(2)
    expect(result[0].login).toBe('bob')
    expect(result[0].totalCommits).toBe(25)
    expect(result[1].login).toBe('alice')
    expect(result[1].totalCommits).toBe(10)
  })

  it('returns empty array for empty input', () => {
    expect(aggregateContributors([])).toEqual([])
  })
})

// ── aggregateFileChurn ───────────────────────────────────────────────────────

describe('aggregateFileChurn', () => {
  const makeDetail = (sha: string, files: string[]): GitHubCommitDetail => ({
    sha,
    files: files.map((f) => ({ filename: f, changes: 1 })),
    commit: { author: { name: 'dev', date: '2024-01-01T00:00:00Z' }, message: 'msg' },
    author: { login: 'dev' },
  })

  it('counts each file appearance across commits', () => {
    const details = [
      makeDetail('a1', ['src/App.tsx', 'src/index.css']),
      makeDetail('a2', ['src/App.tsx', 'src/utils.ts']),
      makeDetail('a3', ['src/App.tsx']),
    ]
    const result = aggregateFileChurn(details)
    expect(result[0].filename).toBe('src/App.tsx')
    expect(result[0].changeCount).toBe(3)
    expect(result).toHaveLength(3)
  })

  it('returns empty array for commits with no files', () => {
    const details = [makeDetail('a1', [])]
    expect(aggregateFileChurn(details)).toEqual([])
  })
})

// ── aggregateGranularity ─────────────────────────────────────────────────────

describe('aggregateGranularity', () => {
  it('maps each commit to a granularity stat', () => {
    const details: GitHubCommitDetail[] = [
      {
        sha: 'abc123',
        files: [{ filename: 'a.ts', changes: 1 }, { filename: 'b.ts', changes: 2 }],
        commit: { author: { name: 'dev', date: '2024-06-01T10:00:00Z' }, message: 'feat: add stuff\n\ndetails' },
        author: { login: 'dev' },
      },
    ]
    const result = aggregateGranularity(details)
    expect(result).toHaveLength(1)
    expect(result[0].filesChanged).toBe(2)
    expect(result[0].authorLogin).toBe('dev')
    expect(result[0].message).toBe('feat: add stuff') // only first line, ≤72 chars
  })

  it('falls back to commit author name when author login is absent', () => {
    const details: GitHubCommitDetail[] = [
      {
        sha: 'xyz',
        files: [],
        commit: { author: { name: 'Jane Doe', date: '2024-01-01T00:00:00Z' }, message: 'fix' },
        author: null,
      },
    ]
    expect(aggregateGranularity(details)[0].authorLogin).toBe('Jane Doe')
  })
})

// ── aggregateBranchMerge ─────────────────────────────────────────────────────

describe('aggregateBranchMerge', () => {
  const makePR = (
    num: number,
    created: string,
    merged: string | null,
  ): GitHubPullRequest => ({
    number: num,
    title: `PR #${num}`,
    state: merged ? 'closed' : 'open',
    merged_at: merged,
    created_at: created,
    head: { ref: `feature/${num}`, sha: 'abc' },
    base: { ref: 'main' },
    user: { login: 'dev' },
  })

  it('filters unmerged PRs and computes duration in hours', () => {
    const prs = [
      makePR(1, '2024-01-01T00:00:00Z', '2024-01-01T12:00:00Z'), // 12 hours
      makePR(2, '2024-01-01T00:00:00Z', null), // open — exclude
    ]
    const result = aggregateBranchMerge(prs)
    expect(result).toHaveLength(1)
    expect(result[0].prNumber).toBe(1)
    expect(result[0].durationHours).toBeCloseTo(12, 1)
  })

  it('sorts by mergedAt descending (most recent first)', () => {
    const prs = [
      makePR(1, '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z'),
      makePR(2, '2024-01-03T00:00:00Z', '2024-01-05T00:00:00Z'),
    ]
    const result = aggregateBranchMerge(prs)
    expect(result[0].prNumber).toBe(2)
  })

  it('returns empty array when all PRs are unmerged', () => {
    expect(aggregateBranchMerge([makePR(1, '2024-01-01T00:00:00Z', null)])).toEqual([])
  })
})
