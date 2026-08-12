import type { CommitGranularityStat } from '../types'

interface Props {
  stats: CommitGranularityStat[]
}

function bucket(filesChanged: number): string {
  if (filesChanged === 1) return '1 file'
  if (filesChanged <= 3) return '2–3 files'
  if (filesChanged <= 10) return '4–10 files'
  if (filesChanged <= 30) return '11–30 files'
  return '31+ files'
}

const BUCKET_COLORS: Record<string, string> = {
  '1 file': 'bg-emerald-400',
  '2–3 files': 'bg-lime-400',
  '4–10 files': 'bg-amber-400',
  '11–30 files': 'bg-orange-500',
  '31+ files': 'bg-red-500',
}

export function CommitGranularity({ stats }: Props) {
  if (stats.length === 0) {
    return <p className="text-slate-400 text-sm">No commit data found.</p>
  }

  // Aggregate into buckets
  const bucketCounts = new Map<string, number>()
  const bucketOrder = ['1 file', '2–3 files', '4–10 files', '11–30 files', '31+ files']
  for (const b of bucketOrder) bucketCounts.set(b, 0)
  for (const s of stats) {
    const b = bucket(s.filesChanged)
    bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1)
  }

  const total = stats.length
  const avg = stats.reduce((acc, s) => acc + s.filesChanged, 0) / total
  const focused = ((bucketCounts.get('1 file')! + bucketCounts.get('2–3 files')!) / total) * 100

  // Most recent commits scatter list
  const recent = [...stats]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <div className="text-center">
          <div className="text-xl font-bold text-slate-700">{avg.toFixed(1)}</div>
          <div className="text-xs text-slate-500">avg files/commit</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-700">{focused.toFixed(0)}%</div>
          <div className="text-xs text-slate-500">focused commits (≤3 files)</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-700">{total}</div>
          <div className="text-xs text-slate-500">commits analysed</div>
        </div>
      </div>

      {/* Bucket bars */}
      <div className="space-y-1.5">
        {bucketOrder.map((b) => {
          const count = bucketCounts.get(b) ?? 0
          const pct = (count / total) * 100
          return (
            <div key={b} className="flex items-center gap-2">
              <span className="w-20 text-xs text-slate-600 shrink-0">{b}</span>
              <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                <div
                  className={`h-4 rounded ${BUCKET_COLORS[b]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-xs text-slate-500 text-right shrink-0">
                {count} ({pct.toFixed(0)}%)
              </span>
            </div>
          )
        })}
      </div>

      {/* Recent commit list */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Recent commits
        </h4>
        <div className="divide-y divide-slate-100 text-xs">
          {recent.map((s) => (
            <div key={s.sha} className="flex items-center gap-2 py-1">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${BUCKET_COLORS[bucket(s.filesChanged)]}`}
              />
              <span className="text-slate-400 shrink-0 font-mono">{s.sha.slice(0, 7)}</span>
              <span className="flex-1 text-slate-600 truncate" title={s.message}>
                {s.message}
              </span>
              <span className="text-slate-400 shrink-0">{s.filesChanged}f</span>
              <span className="text-slate-400 shrink-0">{s.authorLogin}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
