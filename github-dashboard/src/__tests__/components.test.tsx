import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommitsByUser } from '../components/CommitsByUser'
import { MostChangedFiles } from '../components/MostChangedFiles'
import { CommitGranularity } from '../components/CommitGranularity'
import { BranchToMerge } from '../components/BranchToMerge'
import { RateLimitBanner } from '../components/RateLimitBanner'
import type { ContributorStat, FileStat, CommitGranularityStat, BranchMergeStat, RateLimitInfo } from '../types'

// ── CommitsByUser ────────────────────────────────────────────────────────────

describe('CommitsByUser', () => {
  it('renders a row per contributor', () => {
    const stats: ContributorStat[] = [
      { login: 'alice', avatarUrl: 'https://github.com/alice.png', totalCommits: 50 },
      { login: 'bob', avatarUrl: 'https://github.com/bob.png', totalCommits: 20 },
    ]
    render(<CommitsByUser stats={stats} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('50 commits')).toBeInTheDocument()
  })

  it('renders empty message when stats is empty', () => {
    render(<CommitsByUser stats={[]} />)
    expect(screen.getByText(/no contributor data/i)).toBeInTheDocument()
  })
})

// ── MostChangedFiles ─────────────────────────────────────────────────────────

describe('MostChangedFiles', () => {
  it('renders file names', () => {
    const stats: FileStat[] = [
      { filename: 'src/App.tsx', changeCount: 30 },
      { filename: 'src/index.css', changeCount: 5 },
    ]
    render(<MostChangedFiles stats={stats} />)
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument()
    expect(screen.getByText('src/index.css')).toBeInTheDocument()
  })

  it('renders empty message when stats is empty', () => {
    render(<MostChangedFiles stats={[]} />)
    expect(screen.getByText(/no file change data/i)).toBeInTheDocument()
  })

  it('limits to topN entries', () => {
    const stats: FileStat[] = Array.from({ length: 25 }, (_, i) => ({
      filename: `file${i}.ts`,
      changeCount: 25 - i,
    }))
    const { container } = render(<MostChangedFiles stats={stats} topN={5} />)
    // Each file row has a rank span + a bar; expect exactly 5 rank entries
    const ranks = container.querySelectorAll('.space-y-1\\.5 > div')
    expect(ranks.length).toBe(5)
  })
})

// ── CommitGranularity ────────────────────────────────────────────────────────

describe('CommitGranularity', () => {
  const makeStats = (filesChangedArr: number[]): CommitGranularityStat[] =>
    filesChangedArr.map((n, i) => ({
      sha: `sha${i}`,
      filesChanged: n,
      authorLogin: 'dev',
      date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      message: `commit ${i}`,
    }))

  it('renders avg files/commit summary', () => {
    const stats = makeStats([1, 1, 5])
    render(<CommitGranularity stats={stats} />)
    // avg = (1+1+5)/3 ≈ 2.3
    expect(screen.getByText('2.3')).toBeInTheDocument()
  })

  it('renders empty message for empty stats', () => {
    render(<CommitGranularity stats={[]} />)
    expect(screen.getByText(/no commit data/i)).toBeInTheDocument()
  })
})

// ── BranchToMerge ────────────────────────────────────────────────────────────

describe('BranchToMerge', () => {
  const stats: BranchMergeStat[] = [
    {
      prNumber: 42,
      title: 'Add feature X',
      branchName: 'feature/x',
      authorLogin: 'alice',
      firstCommitDate: '2024-01-01T00:00:00Z',
      mergedAt: '2024-01-02T06:00:00Z',
      durationHours: 30,
    },
  ]

  it('renders PR title and author', () => {
    render(<BranchToMerge stats={stats} />)
    expect(screen.getByText('Add feature X')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('renders empty message when no stats', () => {
    render(<BranchToMerge stats={[]} />)
    expect(screen.getByText(/no merged pull requests/i)).toBeInTheDocument()
  })
})

// ── RateLimitBanner ──────────────────────────────────────────────────────────

describe('RateLimitBanner', () => {
  it('renders nothing when remaining > 25%', () => {
    const info: RateLimitInfo = {
      limit: 60,
      remaining: 40,
      used: 20,
      resetAt: new Date(),
    }
    const { container } = render(<RateLimitBanner info={info} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders warning when remaining <= 25%', () => {
    const info: RateLimitInfo = {
      limit: 60,
      remaining: 10,
      used: 50,
      resetAt: new Date(),
    }
    render(<RateLimitBanner info={info} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/rate limit low/i)).toBeInTheDocument()
  })

  it('renders critical message when remaining is 0', () => {
    const info: RateLimitInfo = {
      limit: 60,
      remaining: 0,
      used: 60,
      resetAt: new Date(),
    }
    render(<RateLimitBanner info={info} />)
    expect(screen.getByText(/rate limit exhausted/i)).toBeInTheDocument()
  })
})
