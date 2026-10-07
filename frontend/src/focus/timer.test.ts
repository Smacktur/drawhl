import { describe as group, expect, it } from 'vitest'
import {
  applySettings,
  DEFAULT_SETTINGS,
  describe,
  formatClock,
  initialState,
  normalizeSettings,
  pause,
  play,
  reset,
  skip,
  tick,
  view,
} from './timer'

const MIN = 60_000
const s = DEFAULT_SETTINGS

group('timer', () => {
  it('starts idle on a full focus', () => {
    const t = initialState(s)
    expect(view(t, s, 0)).toMatchObject({ mode: 'idle', remaining: 25 * MIN, progress: 0, done: 0 })
  })

  it('counts down from the end time, not from ticks', () => {
    const t = play(initialState(s), s, 1000)
    expect(t.endsAt).toBe(1000 + 25 * MIN)
    const v = view(t, s, 1000 + 10 * MIN)
    expect(v.mode).toBe('focus')
    expect(v.remaining).toBe(15 * MIN)
    expect(v.progress).toBeCloseTo(0.4)
  })

  it('pauses and resumes from the same second', () => {
    const running = play(initialState(s), s, 0)
    const paused = pause(running, 5 * MIN)
    expect(view(paused, s, 99 * MIN)).toMatchObject({ mode: 'paused', remaining: 20 * MIN })
    const resumed = play(paused, s, 60 * MIN)
    expect(resumed.endsAt).toBe(80 * MIN)
  })

  it('finishes a focus and waits for the user', () => {
    const running = play(initialState(s), s, 0)
    expect(tick(running, s, 25 * MIN - 1).ended).toBeNull()
    const { state, ended } = tick(running, s, 25 * MIN)
    expect(ended).toBe('focus')
    expect(view(state, s, 25 * MIN)).toMatchObject({ mode: 'done', remaining: 0, done: 1 })
  })

  it('takes a short break, then a long one after the last round', () => {
    let t = initialState(s)
    const phases: string[] = []
    let now = 0
    for (let i = 0; i < 8; i++) {
      t = play(t, s, now)
      phases.push(t.phase)
      now = t.endsAt!
      t = tick(t, s, now).state
    }
    expect(phases).toEqual(['focus', 'short', 'focus', 'short', 'focus', 'short', 'focus', 'long'])
    t = play(t, s, now)
    expect(t).toMatchObject({ phase: 'focus', round: 1 })
  })

  it('starts the next phase on its own when asked', () => {
    const auto = { ...s, autoStart: true }
    const running = play(initialState(auto), auto, 0)
    const { state, ended } = tick(running, auto, 25 * MIN + 300)
    expect(ended).toBe('focus')
    expect(state).toMatchObject({ phase: 'short', status: 'running', endsAt: 30 * MIN + 300 })
  })

  it('skips to the next phase, ready to start', () => {
    const t = skip(play(initialState(s), s, 0), s)
    expect(t).toMatchObject({ phase: 'short', status: 'idle', left: 5 * MIN })
    expect(view(t, s, 0).mode).toBe('idle')
  })

  it('resets the cycle', () => {
    expect(reset(s)).toEqual(initialState(s))
  })

  it('shows new lengths on an idle phase only', () => {
    const longer = { ...s, focus: 50 }
    expect(applySettings(initialState(s), longer).left).toBe(50 * MIN)
    const running = play(initialState(s), s, 0)
    expect(applySettings(running, longer)).toEqual(running)
  })

  it('clamps settings', () => {
    expect(normalizeSettings({ focus: 0, short: 999, rounds: 1.4 })).toMatchObject({
      focus: 1,
      short: 60,
      rounds: 2,
    })
  })

  it('formats minutes and seconds', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_001)).toBe('01:02')
    expect(formatClock(0)).toBe('00:00')
  })

  it('names the state for the tooltip', () => {
    const running = play(initialState(s), s, 0)
    expect(describe(running, s, 'focus')).toBe('Focus · round 1 of 4')
    const done = tick(running, s, 25 * MIN).state
    expect(describe(done, s, 'done')).toBe('Focus done · take a short break')
  })
})
