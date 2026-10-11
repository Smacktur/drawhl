import { describe, expect, it } from 'vitest'
import type { Task } from '@/api/tasks'
import {
  checkStatus,
  describeWatch,
  finish,
  goesOffAt,
  newTimer,
  nextRepeat,
  setDue,
  setRepeat,
  snooze,
  timerState,
  waitsForStatus,
  watchStatus,
} from './timer'

const NOW = Date.parse('2026-10-07T08:00:00.000Z')
const MIN = 60_000

describe('timer', () => {
  it('starts with 30 minutes', () => {
    const timer = newTimer(NOW)
    expect(goesOffAt(timer)).toBe(NOW + 30 * MIN)
    expect(timerState(timer, NOW)).toBe('running')
  })

  it('goes through soon to fired', () => {
    const timer = newTimer(NOW)
    expect(timerState(timer, NOW + 25 * MIN)).toBe('soon')
    expect(timerState(timer, NOW + 30 * MIN)).toBe('fired')
  })

  it('snoozes from now and keeps the set time', () => {
    const fired = newTimer(NOW)
    const later = snooze(fired, 10 * MIN, NOW + 31 * MIN)
    expect(goesOffAt(later)).toBe(NOW + 41 * MIN)
    expect(later.dueAt).toBe(fired.dueAt)
    expect(timerState(later, NOW + 35 * MIN)).toBe('running')
  })

  it('a new time clears the snooze and done', () => {
    const done = finish(snooze(newTimer(NOW), MIN, NOW), NOW)
    expect(timerState(done, NOW)).toBe('done')
    const again = setDue(done, NOW + 5 * MIN)
    expect(again).toEqual({ note: '', dueAt: '2026-10-07T08:05:00.000Z' })
  })

  it('waits for a status without a time', () => {
    const timer = { note: '', dueAt: null, watch: { key: 'DEMO-1', status: 'In Review' } }
    expect(timerState(timer, NOW)).toBe('watching')
  })
})

describe('repeat', () => {
  // Wednesday, 7 Oct 2026, 10:00 local time.
  const at = (day: number, hours = 10) => new Date(2026, 9, day, hours).getTime()

  it('moves to the next time of the series after now', () => {
    expect(nextRepeat(at(7), 'daily', at(7, 11))).toBe(at(8))
    expect(nextRepeat(at(7), 'daily', at(10, 11))).toBe(at(11))
    expect(nextRepeat(at(7), 'weekly', at(7, 11))).toBe(at(14))
    // Friday goes to Monday.
    expect(nextRepeat(at(9), 'weekdays', at(9, 11))).toBe(at(12))
  })

  it('Done moves a repeating timer on and stops a single one', () => {
    const daily = setRepeat(setDue(newTimer(NOW), at(7)), 'daily')
    expect(finish(daily, at(7, 11))).toEqual({
      note: '',
      repeat: 'daily',
      dueAt: new Date(at(8)).toISOString(),
    })
    expect(setRepeat(daily, undefined)).not.toHaveProperty('repeat')
  })
})

describe('status timer', () => {
  const task = (status_name: string, state: 'ok' | 'not_found' = 'ok') =>
    ({ key: 'DEMO-1', state, status_name }) as Task

  it('waits while the status is the same or the task is missing', () => {
    const timer = watchStatus(newTimer(NOW), { key: 'DEMO-1' }, 'In Review')
    expect(timerState(timer, NOW)).toBe('watching')
    expect(checkStatus(timer, task('In Review'), NOW)).toBeNull()
    expect(checkStatus(timer, task('Done', 'not_found'), NOW)).toBeNull()
    expect(checkStatus(timer, undefined, NOW)).toBeNull()
    expect(describeWatch(timer.watch!)).toBe('when DEMO-1 leaves In Review')
  })

  it('goes off once on a new status and keeps it', () => {
    const timer = watchStatus(newTimer(NOW), { key: 'DEMO-1' }, 'In Review')
    const fired = checkStatus(timer, task('Done'), NOW)!
    expect(timerState(fired, NOW)).toBe('fired')
    expect(describeWatch(fired.watch!)).toBe('DEMO-1 moved to Done')
    expect(checkStatus(fired, task('In Progress'), NOW + MIN)).toBeNull()
    expect(finish(fired, NOW)).toMatchObject({ done: true })
  })

  it('keeps the board polling in the background only while one waits', () => {
    const waiting = watchStatus(newTimer(NOW), { key: 'DEMO-1' }, 'In Review')
    const node = (data: object) => ({ type: 'timer', data })
    expect(waitsForStatus([node(newTimer(NOW))])).toBe(false)
    expect(waitsForStatus([node(newTimer(NOW)), node(waiting)])).toBe(true)
    expect(waitsForStatus([node(checkStatus(waiting, task('Done'), NOW)!)])).toBe(false)
    expect(waitsForStatus([node(finish(waiting, NOW))])).toBe(false)
  })

  it('a time set later turns it back into a clock timer', () => {
    const timer = setDue(watchStatus(newTimer(NOW), { key: 'DEMO-1' }, 'In Review'), NOW + MIN)
    expect(timer).not.toHaveProperty('watch')
  })
})
