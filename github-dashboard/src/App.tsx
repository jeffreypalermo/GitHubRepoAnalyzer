import { useState } from 'react'
import { DEFAULT_REPO_OWNER, DEFAULT_REPO_NAME } from './config'
import type { RepoConfig } from './types'
import { useContributorStats, useCommitDetails, useBranchMerge, useRateLimit } from './hooks'
import { RepoSelector } from './components/RepoSelector'
import { RateLimitBanner } from './components/RateLimitBanner'
import { Panel } from './components/Panel'
import { CommitsByUser } from './components/CommitsByUser'
import { MostChangedFiles } from './components/MostChangedFiles'
import { CommitGranularity } from './components/CommitGranularity'
import { BranchToMerge } from './components/BranchToMerge'

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function App() {
  const [repo, setRepo] = useState<RepoConfig>({
    owner: DEFAULT_REPO_OWNER,
    name: DEFAULT_REPO_NAME,
  })
  const [token, setToken] = useState('')

  const contributors = useContributorStats(repo.owner, repo.name, token || undefined)
  const commitDetails = useCommitDetails(repo.owner, repo.name, token || undefined)
  const branchMerge = useBranchMerge(repo.owner, repo.name, token || undefined)
  const rateLimit = useRateLimit(token || undefined)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">GitHub Contributor Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {repo.owner}/{repo.name}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Repo selector */}
        <RepoSelector
          value={repo}
          onChange={setRepo}
          token={token}
          onTokenChange={setToken}
        />

        {/* Rate limit banner */}
        <RateLimitBanner info={rateLimit.data} />

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* UC1: Commits by user */}
          <SectionCard
            title="Commits by Contributor"
            subtitle="Ranked by total commit count"
          >
            <Panel state={contributors.state} error={contributors.error} label="contributors">
              <CommitsByUser stats={contributors.data ?? []} />
            </Panel>
          </SectionCard>

          {/* UC2: Most-changed files */}
          <SectionCard
            title="Most-Changed Files"
            subtitle="Files by commit frequency — ⚠ flags potential god-class risk"
          >
            <Panel state={commitDetails.state} error={commitDetails.error} label="file data">
              <MostChangedFiles stats={commitDetails.data?.fileStat ?? []} />
            </Panel>
          </SectionCard>

          {/* UC3: Commit granularity */}
          <SectionCard
            title="Commit Granularity"
            subtitle="Files changed per commit — proxy for commit discipline"
          >
            <Panel state={commitDetails.state} error={commitDetails.error} label="commit data">
              <CommitGranularity stats={commitDetails.data?.granularity ?? []} />
            </Panel>
          </SectionCard>

          {/* UC4: Branch-to-merge duration */}
          <SectionCard
            title="Branch-to-Merge Duration"
            subtitle="PR open time (created → merged) — proxy for cycle time"
          >
            <Panel state={branchMerge.state} error={branchMerge.error} label="pull requests">
              <BranchToMerge stats={branchMerge.data ?? []} />
            </Panel>
          </SectionCard>
        </div>

        <p className="text-xs text-center text-slate-400 pb-4">
          Data sourced from the GitHub public REST API · cached in sessionStorage for 5 min
        </p>
      </main>
    </div>
  )
}
