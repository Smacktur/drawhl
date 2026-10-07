import type { TimerData } from '@/canvas/types'

export const SOON_MS = 5 * 60_000
export const DEFAULT_MS = 30 * 60_000
export const SNOOZES = [
  { label: '+10 min', ms: 10 * 60_000 },
  { label: '+1 hour', ms: 60 * 60_000 },
]

export type TimerState = 'running' | 'soon' | 'fired' | 'done' | 'watching'

const iso = (at: number) => new Date(at).toISOString()

export function newTimer(now: number): TimerData {
  return { note: '', dueAt: iso(now + DEFAULT_MS) }
}

/** When the timer goes off next: a snooze wins over the set time; null while it waits for a status. */
export function goesOffAt(data: TimerData): number | null {
  const at = data.snoozedUntil ?? data.dueAt
  return at ? Date.parse(at) : null
}

export function timerState(data: TimerData, now: number): TimerState {
  if (data.done) return 'done'
  const at = goesOffAt(data)
  if (at === null) return 'watching'
  if (at <= now) return 'fired'
  return at - now <= SOON_MS ? 'soon' : 'running'
}

export function setDue(data: TimerData, at: number): TimerData {
  const { snoozedUntil: _snooze, done: _done, ...rest } = data
  return { ...rest, dueAt: iso(at) }
}

export function snooze(data: TimerData, ms: number, now: number): TimerData {
  const { done: _done, ...rest } = data
  return { ...rest, snoozedUntil: iso(now + ms) }
}

export function finish(data: TimerData): TimerData {
  const { snoozedUntil: _snooze, ...rest } = data
  return { ...rest, done: true }
}
