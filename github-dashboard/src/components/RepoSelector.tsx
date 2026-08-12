import { useState } from 'react'
import type { RepoConfig } from '../types'

interface Props {
  value: RepoConfig
  onChange: (cfg: RepoConfig) => void
  token: string
  onTokenChange: (t: string) => void
}

export function RepoSelector({ value, onChange, token, onTokenChange }: Props) {
  const [owner, setOwner] = useState(value.owner)
  const [name, setName] = useState(value.name)
  const [tok, setTok] = useState(token)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onChange({ owner: owner.trim(), name: name.trim() })
    onTokenChange(tok.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm"
    >
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-medium text-slate-600" htmlFor="repo-owner">
          Owner
        </label>
        <input
          id="repo-owner"
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="owner"
          required
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[220px]">
        <label className="text-xs font-medium text-slate-600" htmlFor="repo-name">
          Repository
        </label>
        <input
          id="repo-name"
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="repo-name"
          required
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[240px]">
        <label className="text-xs font-medium text-slate-600" htmlFor="gh-token">
          GitHub Token{' '}
          <span className="font-normal text-slate-400">(optional — increases rate limit)</span>
        </label>
        <input
          id="gh-token"
          type="password"
          className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={tok}
          onChange={(e) => setTok(e.target.value)}
          placeholder="ghp_..."
          autoComplete="off"
        />
      </div>
      <button
        type="submit"
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded px-4 py-1.5 transition-colors"
      >
        Load
      </button>
    </form>
  )
}
