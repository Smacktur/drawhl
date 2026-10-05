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
    // Capture keeps the release coming even when it happens outside the window.
    ;(event.target as Element).setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY }
    const move = (e: PointerEvent) => setPreview(between(start, { x: e.clientX, y: e.clientY }))
    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', finish)
      window.removeEventListener('keydown', escape, true)
      setPreview(null)
    }
    const up = (e: PointerEvent) => {
      finish()
      onDraw(between(start, { x: e.clientX, y: e.clientY }))
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      finish()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('keydown', escape, true)
  }

  return { preview, onPointerDownCapture }
}
