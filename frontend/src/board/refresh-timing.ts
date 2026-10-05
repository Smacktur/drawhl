import { ApiError } from '@/api/client'
import type { Task } from '@/api/tasks'

export const MAX_INTERVAL_S = 300

// The user has to fix these; polling slower would only delay noticing the fix.
const USER_ACTION_CODES = new Set(['jira_unauthorized', 'jira_not_configured'])

export function userMustAct(error: unknown): boolean {
  return error instanceof ApiError && USER_ACTION_CODES.has(error.code)
}

/** Seconds until the next poll after the given error, or after success when error is null. */
export function nextDelayS(intervalS: number, failures: number, error: unknown): number {
  if (error instanceof ApiError && error.code === 'jira_rate_limited' && error.retryAfter) {
    return Math.min(MAX_INTERVAL_S, Math.max(intervalS, error.retryAfter))
  }
  if (!error || userMustAct(error)) return intervalS
  return Math.min(MAX_INTERVAL_S, intervalS * 2 ** failures)
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
