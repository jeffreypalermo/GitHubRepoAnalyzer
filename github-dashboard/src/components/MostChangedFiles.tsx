import type { FileStat } from '../types'

interface Props {
  stats: FileStat[]
  topN?: number
}

export function MostChangedFiles({ stats, topN = 20 }: Props) {
  const top = stats.slice(0, topN)

  if (top.length === 0) {
    return <p className="text-slate-400 text-sm">No file change data found.</p>
  }

  const max = top[0].changeCount

  return (
    <div className="space-y-1.5">
      {top.map((f, i) => {
        const isGodClass = f.changeCount >= max * 0.6 && i > 0
        return (
          <div key={f.filename} className="flex items-center gap-2">
            <span className="w-5 text-right text-xs text-slate-400 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className="text-xs font-mono text-slate-700 truncate"
                  title={f.filename}
                >
                  {f.filename}
                </span>
                <span className="flex items-center gap-1 ml-2 shrink-0">
                  {isGodClass && (
                    <span
                      title="High churn — potential god-class risk"
                      className="text-xs text-amber-600 font-semibold"
                    >
                      ⚠
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{f.changeCount}×</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-rose-400"
                  style={{ width: `${(f.changeCount / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
