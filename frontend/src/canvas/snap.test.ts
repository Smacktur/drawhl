import { describe, expect, it } from 'vitest'
import { snap, type Box } from '@/canvas/snap'

const box = (x: number, y: number, width = 100, height = 100): Box => ({ x, y, width, height })

describe('snap', () => {
  it('leaves a box alone when nothing is near', () => {
    expect(snap(box(500, 500), [box(0, 0)], 6)).toEqual({ x: 500, y: 500, guides: [] })
  })

  it('aligns top edges and draws a line across both boxes', () => {
    const result = snap(box(300, 4), [box(0, 0)], 6)
    expect(result.y).toBe(0)
    expect(result.guides).toContainEqual({ kind: 'align', x1: 0, y1: 0, x2: 400, y2: 0 })
  })

  it('aligns centers of boxes of different sizes', () => {
    const result = snap(box(53, 300, 50, 50), [box(0, 0, 150, 100)], 6)
    expect(result.x).toBe(50)
  })

  it('picks the closer of two matches', () => {
    const result = snap(box(300, 3), [box(0, 0), box(600, 1)], 6)
    expect(result.y).toBe(1)
  })

  it('centers a box between two neighbors and marks both gaps', () => {
    const result = snap(box(228, 200), [box(0, 200), box(450, 200)], 6)
    expect(result.x).toBe(225)
    expect(result.guides.filter((g) => g.kind === 'gap')).toEqual([
      { kind: 'gap', x1: 100, y1: 250, x2: 225, y2: 250 },
      { kind: 'gap', x1: 325, y1: 250, x2: 450, y2: 250 },
    ])
  })

  it('repeats the gap of a row it extends', () => {
    const result = snap(box(296, 0), [box(0, 0), box(150, 0)], 6)
    expect(result.x).toBe(300)
    expect(result.guides.filter((g) => g.kind === 'gap')).toHaveLength(2)
  })

  it('repeats the gap of a column it extends', () => {
    const result = snap(box(0, 297), [box(0, 0), box(0, 150)], 6)
    expect(result.y).toBe(300)
    expect(result.guides.filter((g) => g.kind === 'gap')).toEqual([
      { kind: 'gap', x1: 50, y1: 100, x2: 50, y2: 150 },
      { kind: 'gap', x1: 50, y1: 250, x2: 50, y2: 300 },
    ])
  })

  it('ignores neighbors outside the row', () => {
    const result = snap(box(296, 400), [box(0, 0), box(150, 0)], 6)
    expect(result.guides.some((g) => g.kind === 'gap')).toBe(false)
  })
})
