import type { TimerEntry } from './useTimers'

export type Group = { title: string; timers: TimerEntry[] }

export const sameDay = (a: number, b: number) =>
  new Date(a).toDateString() === new Date(b).toDateString()

/** Gone off, today, later, waiting for a status, done; empty groups are left out. */
export function groupTimers(timers: TimerEntry[], now: number): Group[] {
  const running = timers.filter((t) => t.state === 'running' || t.state === 'soon')
  return [
    { title: 'Gone off', timers: timers.filter((t) => t.state === 'fired') },
    { title: 'Today', timers: running.filter((t) => sameDay(t.at!, now)) },
    { title: 'Later', timers: running.filter((t) => !sameDay(t.at!, now)) },
    { title: 'Waiting for status', timers: timers.filter((t) => t.state === 'watching') },
    { title: 'Done', timers: timers.filter((t) => t.state === 'done') },
  ].filter((g) => g.timers.length > 0)
}
