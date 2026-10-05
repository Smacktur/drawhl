import { expect, test } from 'vitest'
import { gridPositions } from '@/canvas/layout'

test('cards form a near-square grid filled row by row around the center', () => {
  const positions = gridPositions(5, { x: 0, y: 0 })
  expect(positions).toHaveLength(5)
  const columns = new Set(positions.map((p) => p.x)).size
  const rows = new Set(positions.map((p) => p.y)).size
  expect([columns, rows]).toEqual([3, 2])
  expect(positions[0].y).toBe(positions[2].y)
  expect(positions[0].x).toBeLessThan(0)
  expect(positions[0].y).toBeLessThan(0)
})
