import { useReactFlow, type Viewport } from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'

// Release speed is read from the last moments of the drag; a pause before release means no glide.
const SAMPLE_MS = 100
const MIN_SPEED = 0.3 // px per ms
const STOP_SPEED = 0.02
const DECAY_MS = 325

type Sample = { t: number; x: number; y: number }

/** Velocity in px/ms from drag samples, or null when the pointer was still at release. */
export function releaseVelocity(samples: Sample[], now: number) {
  const recent = samples.filter((s) => now - s.t <= SAMPLE_MS)
  if (recent.length < 2) return null
  const first = recent[0]
  const last = recent[recent.length - 1]
  const dt = last.t - first.t
  if (dt <= 0) return null
  const v = { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
  return Math.hypot(v.x, v.y) >= MIN_SPEED ? v : null
}

function isDrag(event: MouseEvent | TouchEvent | null): event is MouseEvent | TouchEvent {
  return event !== null && !(event instanceof WheelEvent)
}

/** Lets the canvas glide after a mouse pan, like trackpad momentum scrolling. */
export function useInertia() {
  const { getViewport, setViewport } = useReactFlow()
  const samples = useRef<Sample[]>([])
  const frame = useRef(0)

  const stop = useCallback(() => cancelAnimationFrame(frame.current), [])
  useEffect(() => stop, [stop])

  const onMove = useCallback((event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    if (!isDrag(event)) return
    const now = event.timeStamp
    samples.current = [
      ...samples.current.filter((s) => now - s.t <= SAMPLE_MS),
      { t: now, x: viewport.x, y: viewport.y },
    ]
  }, [])

  const onMoveEnd = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      if (!isDrag(event)) return
      // xyflow reports the end late when panOnScroll is on, so time it by the release itself.
      const v = releaseVelocity(samples.current, event.timeStamp)
      samples.current = []
      if (!v) return
      let last = performance.now()
      const step = (now: number) => {
        const dt = now - last
        last = now
        const decay = Math.exp(-dt / DECAY_MS)
        v.x *= decay
        v.y *= decay
        if (Math.hypot(v.x, v.y) < STOP_SPEED) return
        const { x, y, zoom } = getViewport()
        void setViewport({ x: x + v.x * dt, y: y + v.y * dt, zoom })
        frame.current = requestAnimationFrame(step)
      }
      frame.current = requestAnimationFrame(step)
    },
    [getViewport, setViewport],
  )

  return { onMove, onMoveEnd, stop }
}
