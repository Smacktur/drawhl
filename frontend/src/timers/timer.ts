import type { Task } from '@/api/tasks'
import type { TaskLink } from '@/canvas/tasks-context'
import type { TimerData, TimerRepeat } from '@/canvas/types'

export const SOON_MS = 5 * 60_000
export const DEFAULT_MS = 30 * 60_000
export const REPEATS: { value: TimerRepeat | undefined; label: string }[] = [
  { value: undefined, label: 'Once' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Every week' },
]

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

/** A clock timer at this moment; it stops waiting for a status. */
export function setDue(data: TimerData, at: number): TimerData {
  const { snoozedUntil: _snooze, done: _done, watch: _watch, ...rest } = data
  return { ...rest, dueAt: iso(at) }
}

export function setRepeat(data: TimerData, repeat: TimerRepeat | undefined): TimerData {
  const { repeat: _old, ...rest } = data
  return repeat ? { ...rest, repeat } : rest
}

/** A timer that goes off when the task leaves its current status. */
export function watchStatus(data: TimerData, task: TaskLink, status: string): TimerData {
  const { snoozedUntil: _snooze, done: _done, repeat: _repeat, ...rest } = data
  const { key, source } = task
  return { ...rest, dueAt: null, watch: { key, ...(source && { source }), status } }
}

/** The status timer goes off now if the board sees the task in another status. */
export function checkStatus(data: TimerData, task: Task | undefined, now: number) {
  const watch = data.watch
  if (!watch || data.done || data.dueAt || !task || task.state !== 'ok') return null
  if (task.status_name === watch.status) return null
  return { ...data, dueAt: iso(now), watch: { ...watch, changedTo: task.status_name } }
}

/** True when a status timer still waits: the board then keeps polling in a background tab. */
export function waitsForStatus(nodes: { type?: string; data: unknown }[]) {
  return nodes.some((n) => {
    if (n.type !== 'timer') return false
    const data = n.data as TimerData
    return Boolean(data.watch && !data.done && !data.dueAt)
  })
}

/** What a status timer waits for or saw. */
export function describeWatch(watch: NonNullable<TimerData['watch']>) {
  return watch.changedTo
    ? `${watch.key} moved to ${watch.changedTo}`
    : `when ${watch.key} leaves ${watch.status}`
}

/** The first time of the series after now, counting from the set time. */
export function nextRepeat(dueAt: number, repeat: TimerRepeat, now: number) {
  const next = new Date(dueAt)
  // Calendar days, not 24 h steps, so the clock time holds across daylight saving changes.
  const step = () => next.setDate(next.getDate() + (repeat === 'weekly' ? 7 : 1))
  do {
    step()
    while (repeat === 'weekdays' && (next.getDay() === 0 || next.getDay() === 6)) step()
  } while (next.getTime() <= now)
  return next.getTime()
}

export function snooze(data: TimerData, ms: number, now: number): TimerData {
  const { done: _done, ...rest } = data
  return { ...rest, snoozedUntil: iso(now + ms) }
}

/** Done: a repeating timer moves on to its next time, any other one stops. */
export function finish(data: TimerData, now: number): TimerData {
  const { snoozedUntil: _snooze, ...rest } = data
  if (data.repeat && data.dueAt && !data.watch) {
    return { ...rest, dueAt: iso(nextRepeat(Date.parse(data.dueAt), data.repeat, now)) }
  }
  return { ...rest, done: true }
}
