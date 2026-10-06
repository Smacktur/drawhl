import { describe, expect, it } from 'vitest'
import {
  acceptCard,
  addRows,
  bodyHeight,
  HEADER,
  MAX_ROWS,
  moveRow,
  removeRow,
  ROW_HEIGHT,
  type Row,
} from '@/modules/gantt/rows'
import type { GanttContent } from '@/modules/gantt/schema'

const row = (id: string, key?: string): Row => ({
  id,
  ...(key && { key }),
  title: '',
  start: '2026-10-05',
  end: '2026-10-09',
})

const base: GanttContent = {
  start: '2026-10-01',
  end: '2026-10-31',
  scale: 'week',
  labelWidth: 160,
  rows: [row('a', 'DEMO-1'), row('b')],
  milestones: [],
  links: [{ id: 'l', from: 'a', to: 'b' }],
}
// 31 days over 310px of timeline: 10px a day.
const WIDTH = base.labelWidth + 310

describe('rows', () => {
  it('skips tasks already on the chart and stops at the limit', () => {
    expect(addRows(base, [row('c', 'DEMO-1'), row('d', 'DEMO-2')]).rows.map((r) => r.id)).toEqual([
      'a',
      'b',
      'd',
    ])
    const full = { ...base, rows: Array.from({ length: MAX_ROWS }, (_, i) => row(String(i))) }
    expect(addRows(full, [row('x')]).rows).toHaveLength(MAX_ROWS)
  })

  it('removes a row with its links', () => {
    const next = removeRow(base, 'a')
    expect(next.rows.map((r) => r.id)).toEqual(['b'])
    expect(next.links).toEqual([])
  })

  it('moves a row to a clamped index', () => {
    expect(moveRow(base, 'a', 5).rows.map((r) => r.id)).toEqual(['b', 'a'])
    expect(moveRow(base, 'b', -2).rows.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('grows with rows and keeps one empty row', () => {
    expect(bodyHeight({ ...base, rows: [] })).toBe(bodyHeight({ ...base, rows: [row('a')] }))
    expect(bodyHeight(base) - bodyHeight({ ...base, rows: [row('a')] })).toBe(ROW_HEIGHT)
  })
})

describe('card drop', () => {
  it('becomes a row at the drop day, between the rows it fell on', () => {
    const at = { x: base.labelWidth + 95, y: HEADER + ROW_HEIGHT }
    const next = acceptCard(base, 'DEMO-7', at, WIDTH)!
    expect(next.rows.map((r) => r.key ?? r.id)).toEqual(['DEMO-1', 'DEMO-7', 'b'])
    expect(next.rows[1]).toMatchObject({ start: '2026-10-10', end: '2026-10-16' })
  })

  it('is refused for a task already on the chart', () => {
    expect(acceptCard(base, 'DEMO-1', { x: 300, y: 60 }, WIDTH)).toBeNull()
  })
})
