import type { RateLimitInfo } from '../types'

interface Props {
  info: RateLimitInfo | null
}

export function RateLimitBanner({ info }: Props) {
  if (!info) return null
  const pct = info.remaining / info.limit
  if (pct > 0.25) return null // only show when < 25% remaining

  const resetTime = info.resetAt.toLocaleTimeString()
  const isCritical = info.remaining === 0

  return (
    <div
      role="alert"
      className={`rounded-md border px-4 py-3 text-sm flex items-center gap-2 ${
        isCritical
          ? 'bg-red-50 border-red-300 text-red-800'
          : 'bg-amber-50 border-amber-300 text-amber-800'
      }`}
    >
      <span className="text-lg">{isCritical ? '🚫' : '⚠️'}</span>
      <span>
        {isCritical
          ? `GitHub API rate limit exhausted. Resets at ${resetTime}.`
          : `GitHub API rate limit low: ${info.remaining} / ${info.limit} requests remaining. Resets at ${resetTime}.`}
      </span>
    </div>
  )
}
