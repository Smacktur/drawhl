import type { Viewport } from '@xyflow/react'

const key = (boardId: string) => `tiko:viewport:${boardId}`

/** Where this person left the board in this browser; null when they have not been here. */
export function readViewport(boardId: string): Viewport | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key(boardId)) ?? 'null')
    const { x, y, zoom } = (stored ?? {}) as Partial<Viewport>
    return [x, y, zoom].every(Number.isFinite) ? { x: x!, y: y!, zoom: zoom! } : null
  } catch {
    return null
  }
}

export function saveViewport(boardId: string, { x, y, zoom }: Viewport) {
  try {
    localStorage.setItem(key(boardId), JSON.stringify({ x, y, zoom }))
  } catch {
    // Storage is full or blocked: the board opens fitted next time.
  }
}
