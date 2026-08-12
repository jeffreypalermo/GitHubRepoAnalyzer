import type { LoadState } from '../hooks'

interface Props {
  state: LoadState
  error: string | null
  children: React.ReactNode
  label?: string
}

export function Panel({ state, error, children, label }: Props) {
  if (state === 'idle' || state === 'loading') {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        <span className="animate-pulse">{label ? `Loading ${label}…` : 'Loading…'}</span>
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        <strong>Error:</strong> {error}
      </div>
    )
  }
  return <>{children}</>
}
