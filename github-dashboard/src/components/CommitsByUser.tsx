import type { ContributorStat } from '../types'

interface Props {
  stats: ContributorStat[]
}

export function CommitsByUser({ stats }: Props) {
  if (stats.length === 0) {
    return <p className="text-slate-400 text-sm">No contributor data found.</p>
  }

  const max = stats[0].totalCommits

  return (
    <div className="space-y-2">
      {stats.map((c, i) => (
        <div key={c.login} className="flex items-center gap-3">
          <span className="w-6 text-right text-xs text-slate-400 shrink-0">{i + 1}</span>
          <img
            src={c.avatarUrl}
            alt={c.login}
            className="w-7 h-7 rounded-full shrink-0 border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-slate-700 truncate">{c.login}</span>
              <span className="text-xs text-slate-500 ml-2 shrink-0">
                {c.totalCommits.toLocaleString()} commits
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${(c.totalCommits / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
