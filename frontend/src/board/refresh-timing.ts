import type { SyncSource } from '@/api/boards'
import type { Task } from '@/api/tasks'

export const MAX_INTERVAL_S = 300

/** Seconds until the next poll: the interval, or longer while a tracker asked us to wait. */
export function nextDelayS(intervalS: number, sources: SyncSource[]): number {
  const wait = Math.max(0, ...sources.map((source) => source.error?.retry_after ?? 0))
  return Math.min(MAX_INTERVAL_S, Math.max(intervalS, wait))
}

export type SyncHealth = 'ok' | 'partial' | 'down'

/** Down when no tracker syncs (or the drawhl server itself fails), partial when only some do. */
export function syncHealth(sources: SyncSource[], serverError: unknown): SyncHealth {
  const failing = sources.filter((source) => source.state === 'error').length
  if (serverError || (sources.length > 0 && failing === sources.length)) return 'down'
  return failing ? 'partial' : 'ok'
}

/** Newest successful sync across trackers, in ms; 0 when none synced in this server session. */
export function lastSynced(sources: SyncSource[]): number {
  return Math.max(0, ...sources.map((source) => Date.parse(source.synced_at ?? '') || 0))
}

/** A card's snapshot can come from the board load, a fresh add or a refresh; the newest wins. */
export function newest(sources: Record<string, Task>[]): Record<string, Task> {
  const merged: Record<string, Task> = {}
  for (const source of sources) {
    for (const [key, task] of Object.entries(source)) {
      const current = merged[key]
      if (!current || current.fetched_at <= task.fetched_at) merged[key] = task
    }
  }
  return merged
}

/** Time of the newest stored snapshot, shown before the first refresh of this session. */
export function lastFetched(tasks: Record<string, Task>): number {
  return Math.max(0, ...Object.values(tasks).map((task) => Date.parse(task.fetched_at) || 0))
}
