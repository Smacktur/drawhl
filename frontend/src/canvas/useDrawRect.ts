import type { XYPosition } from '@xyflow/react'
import { useState, type PointerEvent as ReactPointerEvent } from 'react'

export type ScreenRect = { x: number; y: number; width: number; height: number }

function between(a: XYPosition, b: XYPosition): ScreenRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

/** Press and drag on the canvas to draw a rectangle in screen coordinates. */
export function useDrawRect(enabled: boolean, onDraw: (rect: ScreenRect) => void) {
  const [preview, setPreview] = useState<ScreenRect | null>(null)

  const onPointerDownCapture = (event: ReactPointerEvent) => {
    if (!enabled || event.button !== 0) return
    if (!(event.target as Element).closest('.react-flow__pane, .react-flow__node')) return
    const start = { x: event.clientX, y: event.clientY }
    const move = (e: PointerEvent) => setPreview(between(start, { x: e.clientX, y: e.clientY }))
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      setPreview(null)
      onDraw(between(start, { x: e.clientX, y: e.clientY }))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  return { preview, onPointerDownCapture }
}
