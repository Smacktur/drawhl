import { describe, expect, it } from 'vitest'
import { finish, goesOffAt, newTimer, setDue, snooze, timerState } from './timer'

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
    const done = finish(snooze(newTimer(NOW), MIN, NOW))
    expect(timerState(done, NOW)).toBe('done')
    const again = setDue(done, NOW + 5 * MIN)
    expect(again).toEqual({ note: '', dueAt: '2026-10-07T08:05:00.000Z' })
  })

  it('waits for a status without a time', () => {
    const timer = { note: '', dueAt: null, watch: { key: 'DEMO-1', status: 'In Review' } }
    expect(timerState(timer, NOW)).toBe('watching')
  })
})
