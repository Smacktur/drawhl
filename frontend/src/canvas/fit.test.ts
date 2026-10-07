import { describe, expect, it } from 'vitest'
import { fitFontSize, STICKY_FONT, wouldExceed } from '@/canvas/fit'

describe('fitFontSize', () => {
  it('keeps the full size when the text fits', () => {
    const calls: number[] = []
    const size = fitFontSize((s) => {
      calls.push(s)
      return true
    })
    expect(size).toBe(STICKY_FONT)
    expect(calls).toEqual([STICKY_FONT])
  })

  it('finds the largest size that fits', () => {
    expect(fitFontSize((s) => s <= 9.6)).toBe(9.5)
  })

  it('goes far below the usual minimum for very long text', () => {
    expect(fitFontSize((s) => s <= 2.1)).toBe(2)
  })

  it('never returns a size that does not fit', () => {
    for (const limit of [1.3, 4.9, 7.77, 13.9]) {
      expect(fitFontSize((s) => s <= limit)).toBeLessThanOrEqual(limit)
    }
  })
})

describe('wouldExceed', () => {
  const field = (length: number, start = length, end = length) => ({
    value: 'x'.repeat(length),
    selectionStart: start,
    selectionEnd: end,
  })

  it('blocks typing at the limit', () => {
    expect(wouldExceed(field(2000), 1)).toBe(true)
    expect(wouldExceed(field(1999), 1)).toBe(false)
  })

  it('counts the selection that gets replaced', () => {
    expect(wouldExceed(field(2000, 0, 5), 5)).toBe(false)
    expect(wouldExceed(field(2000, 0, 5), 6)).toBe(true)
  })

  it('never blocks deleting from an older, longer note', () => {
    expect(wouldExceed(field(3000), 0)).toBe(false)
  })
})
