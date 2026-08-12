import type { BranchMergeStat } from '../types'

interface Props {
  stats: BranchMergeStat[]
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function durationColor(hours: number): string {
  if (hours <= 24) return 'bg-emerald-400'
  if (hours <= 72) return 'bg-amber-400'
  if (hours <= 168) return 'bg-orange-500'
  return 'bg-red-500'
}

export function BranchToMerge({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <p className="text-slate-400 text-sm">
        No merged pull requests found.
      </p>
    )
  }

  const maxDuration = Math.max(...stats.map((s) => s.durationHours))
  const avg = stats.reduce((acc, s) => acc + s.durationHours, 0) / stats.length
  const under24h = stats.filter((s) => s.durationHours <= 24).length
  const under24pct = ((under24h / stats.length) * 100).toFixed(0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <div className="text-center">
          <div className="text-xl font-bold text-slate-700">{formatDuration(avg)}</div>
          <div className="text-xs text-slate-500">avg cycle time</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-700">{under24pct}%</div>
          <div className="text-xs text-slate-500">merged within 24h</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-700">{stats.length}</div>
          <div className="text-xs text-slate-500">merged PRs</div>
        </div>
      </div>

      {/* Waterfall */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {stats.map((s) => (
          <div key={s.prNumber} className="flex items-center gap-2">
            <span className="w-8 text-xs text-slate-400 shrink-0 text-right">
              #{s.prNumber}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className="text-xs text-slate-700 truncate"
                  title={s.title}
                >
                  {s.title}
                </span>
                <span className="text-xs text-slate-500 ml-2 shrink-0">
                  {formatDuration(s.durationHours)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${durationColor(s.durationHours)}`}
                  style={{
                    width: `${maxDuration > 0 ? (s.durationHours / maxDuration) * 100 : 0}%`,
                    minWidth: '2px',
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0 w-20 truncate" title={s.authorLogin}>
              {s.authorLogin}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />≤24h</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />1–3d</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />3–7d</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />&gt;7d</span>
      </div>
    </div>
  )
}
