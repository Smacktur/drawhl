import type { XYPosition } from '@xyflow/react'

// A card is at most 320 px wide and a few lines tall; the cell leaves a gap around it.
const CELL = { width: 344, height: 104 }

/** Top-left corners of a near-square grid of cards, centered on a point, filled row by row. */
export function gridPositions(count: number, center: XYPosition): XYPosition[] {
  const columns = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / columns)
  const left = center.x - (columns * CELL.width) / 2
  const top = center.y - (rows * CELL.height) / 2
  return Array.from({ length: count }, (_, i) => ({
    x: left + (i % columns) * CELL.width,
    y: top + Math.floor(i / columns) * CELL.height,
  }))
}
