import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchContributorStats, fetchCommits, fetchPullRequests } from '../githubClient'
import type { GitHubContributor, GitHubCommitSummary, GitHubPullRequest } from '../types'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockJsonResponse<T>(body: T, status = 200, linkHeader: string | null = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 202 ? 'Accepted' : 'Error',
    json: async () => body,
    headers: {
      get: (key: string) => (key === 'Link' ? linkHeader : null),
    },
  }
}

describe('fetchContributorStats', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockFetch.mockReset()
  })

  it('returns contributor list from API', async () => {
    const payload: GitHubContributor[] = [
      { author: { login: 'alice', avatar_url: 'https://a.com/alice.png' }, total: 10, weeks: [] },
    ]
    mockFetch.mockResolvedValueOnce(mockJsonResponse(payload))
    const result = await fetchContributorStats('owner', 'repoA')
    expect(result).toEqual(payload)
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('uses sessionStorage cache on second call', async () => {
    const payload: GitHubContributor[] = [
      { author: { login: 'bob', avatar_url: 'https://a.com/bob.png' }, total: 5, weeks: [] },
    ]
    mockFetch.mockResolvedValue(mockJsonResponse(payload))
    await fetchContributorStats('owner', 'repoB')
    await fetchContributorStats('owner', 'repoB')
    // fetch should only have been called once; second call served from cache
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('retries on 202 and returns data on second attempt', async () => {
    const payload: GitHubContributor[] = [
      { author: { login: 'dev', avatar_url: 'https://a.com/dev.png' }, total: 1, weeks: [] },
    ]
    // 202 on first, 200 with data on second
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(null, 202))
      .mockResolvedValueOnce(mockJsonResponse(payload))

    vi.useFakeTimers()
    const promise = fetchContributorStats('owner', 'repoC')
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toEqual(payload)
    vi.useRealTimers()
  })
})

describe('fetchCommits', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockFetch.mockReset()
  })

  it('fetches all pages and concatenates', async () => {
    const page1: GitHubCommitSummary[] = [
      { sha: 'abc', commit: { author: { name: 'dev', date: '2024-01-01T00:00:00Z' }, message: 'm1' }, author: { login: 'dev' } },
    ]
    const page2: GitHubCommitSummary[] = [
      { sha: 'def', commit: { author: { name: 'dev', date: '2024-01-02T00:00:00Z' }, message: 'm2' }, author: { login: 'dev' } },
    ]
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(page1, 200, '<https://api.github.com/repos/owner/repoX/commits?page=2>; rel="next"'))
      .mockResolvedValueOnce(mockJsonResponse(page2))

    const result = await fetchCommits('owner', 'repoX')
    expect(result).toHaveLength(2)
    expect(result[0].sha).toBe('abc')
    expect(result[1].sha).toBe('def')
  })
})

describe('fetchPullRequests', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockFetch.mockReset()
  })

  it('fetches merged PRs', async () => {
    const prs: GitHubPullRequest[] = [
      {
        number: 1,
        title: 'feat: something',
        state: 'closed',
        merged_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        head: { ref: 'feature/x', sha: 'abc' },
        base: { ref: 'main' },
        user: { login: 'dev' },
      },
    ]
    mockFetch.mockResolvedValue(mockJsonResponse(prs))
    const result = await fetchPullRequests('owner', 'repoY')
    expect(result).toHaveLength(1)
    expect(result[0].number).toBe(1)
  })
})
