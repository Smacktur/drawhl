import { expect, it } from 'vitest'
import { tone } from './tone'

it('warms from green to raspberry over a focus', () => {
  expect(tone('focus', 0).hue).toBe(150)
  expect(tone('focus', 0.5).hue).toBe(95)
  expect(tone('focus', 1).hue).toBe(8)
  expect(tone('focus', 0.25).hue).toBeCloseTo(122.5)
})

it('keeps the other states on their own hue', () => {
  expect(tone('idle', 0.7).chroma).toBeLessThan(0.01)
  expect(tone('paused', 0.7).hue).toBe(250)
  expect(tone('break', 0.7).hue).toBe(300)
  expect(tone('done', 1).hue).toBe(8)
})
