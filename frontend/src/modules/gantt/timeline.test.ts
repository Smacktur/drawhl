import { describe, expect, it } from 'vitest'
import {
  barBox,
  currentQuarter,
  dayAt,
  dragSpan,
  fitsRange,
  formatDay,
  header,
  newSpan,
  parseDay,
  quarterAfter,
  quarterBefore,
  rangeDays,
  today,
} from '@/modules/gantt/timeline'

const d = parseDay

describe('days', () => {
  it('round-trips ISO dates', () => {
    expect(formatDay(d('2026-10-06'))).toBe('2026-10-06')
    expect(d('2026-10-07') - d('2026-10-06')).toBe(1)
  })

  it('takes today from the local calendar date', () => {
    expect(formatDay(today(new Date(2026, 9, 6, 23, 59)))).toBe('2026-10-06')
  })
})

describe('quarters', () => {
  it('finds the current quarter', () => {
    const q = currentQuarter(d('2026-11-15'))
    expect([formatDay(q.start), formatDay(q.end)]).toEqual(['2026-10-01', '2026-12-31'])
  })

  it('adds a calendar quarter on either side', () => {
    expect(formatDay(quarterBefore(d('2026-10-01')))).toBe('2026-07-01')
    expect(formatDay(quarterBefore(d('2026-01-20')))).toBe('2025-10-01')
    expect(formatDay(quarterAfter(d('2026-12-31')))).toBe('2027-03-31')
    expect(formatDay(quarterAfter(d('2026-08-10')))).toBe('2026-12-31')
  })

  it('limits the range to about 3 years', () => {
    expect(fitsRange(d('2026-01-01'), d('2028-12-31'))).toBe(true)
    expect(fitsRange(d('2026-01-01'), d('2029-04-01'))).toBe(false)
    expect(fitsRange(d('2026-01-02'), d('2026-01-01'))).toBe(false)
  })
})

describe('header', () => {
  const start = d('2026-09-28')
  const end = d('2026-12-31')

  it('covers the range without gaps at every scale', () => {
    for (const scale of ['day', 'week', 'month'] as const) {
      const { top, bottom } = header(start, end, scale)
      for (const row of [top, bottom]) {
        expect(row[0].from).toBe(0)
        expect(row.reduce((sum, cell) => sum + cell.span, 0)).toBe(rangeDays(start, end))
      }
    }
  })

  it('shows quarters over ISO weeks, clipping the first week to the range', () => {
    const { top, bottom } = header(d('2026-09-30'), end, 'week')
    expect(top.map((c) => c.label)).toEqual(['Q3 2026', 'Q4 2026'])
    expect(top[0].span).toBe(1)
    expect(bottom[0]).toEqual({ label: 'W40', from: 0, span: 5 })
    expect(bottom[1].label).toBe('W41')
  })

  it('shows months over days and marks weekends', () => {
    const { top, bottom } = header(start, d('2026-10-04'), 'day')
    expect(top.map((c) => c.label)).toEqual(['Sep 2026', 'Oct 2026'])
    expect(bottom.map((c) => c.label)).toEqual(['28', '29', '30', '1', '2', '3', '4'])
    expect(bottom.map((c) => Boolean(c.weekend))).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ])
  })

  it('shows quarters over months', () => {
    const { bottom } = header(start, end, 'month')
    expect(bottom.map((c) => c.label)).toEqual(['Sep', 'Oct', 'Nov', 'Dec'])
  })

  it('numbers the week of 1 January by ISO rules', () => {
    expect(header(d('2026-12-28'), d('2027-01-10'), 'week').bottom.map((c) => c.label)).toEqual([
      'W53',
      'W1',
    ])
  })
})

describe('bars', () => {
  const range = { start: d('2026-10-01'), end: d('2026-10-31') }

  it('places a bar by its days, end day included', () => {
    expect(barBox({ start: d('2026-10-03'), end: d('2026-10-04') }, range, 10)).toEqual({
      left: 20,
      width: 20,
      clippedStart: false,
      clippedEnd: false,
    })
  })

  it('clips a bar at the range edges and hides one fully outside', () => {
    const box = barBox({ start: d('2026-09-20'), end: d('2026-10-02') }, range, 10)
    expect(box).toMatchObject({ left: 0, width: 20, clippedStart: true })
    expect(barBox({ start: d('2026-11-02'), end: d('2026-11-05') }, range, 10)).toBeNull()
  })

  it('maps x to a day inside the range', () => {
    expect(formatDay(dayAt(25, range, 10))).toBe('2026-10-03')
    expect(formatDay(dayAt(-40, range, 10))).toBe('2026-10-01')
    expect(formatDay(dayAt(9999, range, 10))).toBe('2026-10-31')
  })

  it('moves and stretches by whole days without inverting', () => {
    const span = { start: 10, end: 14 }
    expect(dragSpan(span, 'move', -3)).toEqual({ start: 7, end: 11 })
    expect(dragSpan(span, 'start', 2)).toEqual({ start: 12, end: 14 })
    expect(dragSpan(span, 'start', 9)).toEqual({ start: 14, end: 14 })
    expect(dragSpan(span, 'end', -9)).toEqual({ start: 10, end: 10 })
  })

  it('starts a new bar today when today is in range', () => {
    expect(newSpan(range, undefined, d('2026-10-06'))).toEqual({
      start: d('2026-10-06'),
      end: d('2026-10-12'),
    })
    expect(newSpan(range, undefined, d('2027-01-06')).start).toBe(range.start)
    expect(newSpan(range, d('2026-10-20')).start).toBe(d('2026-10-20'))
  })
})
