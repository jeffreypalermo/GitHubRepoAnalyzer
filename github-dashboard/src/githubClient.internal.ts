import { CACHE_TTL_MS } from './config'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // sessionStorage full — silently skip caching
  }
}
