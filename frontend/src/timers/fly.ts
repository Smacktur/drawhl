import type { InternalNode, SetCenter } from '@xyflow/react'
import { useSyncExternalStore } from 'react'

const FLASH_MS = 1200
// At least this zoom, so a 40px cube is easy to see after the move.
const MIN_ZOOM = 0.8

let flashing: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True for a short moment after the board moved to this timer. */
export function useFlashing(id: string) {
  return useSyncExternalStore(
    subscribe,
    () => flashing === id,
    () => false,
  )
}

type Flow = {
  getInternalNode: (id: string) => InternalNode | undefined
  getZoom: () => number
  setCenter: SetCenter
}

/** Moves the board to a node at the current zoom and flashes it. */
export function flyTo(flow: Flow, id: string) {
  const node = flow.getInternalNode(id)
  if (!node) return
  const { x, y } = node.internals.positionAbsolute
  const width = node.measured.width ?? node.width ?? 0
  const height = node.measured.height ?? node.height ?? 0
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  void flow.setCenter(x + width / 2, y + height / 2, {
    zoom: Math.max(flow.getZoom(), MIN_ZOOM),
    duration: still ? 0 : 400,
  })
  flashing = id
  emit()
  setTimeout(() => {
    if (flashing !== id) return
    flashing = null
    emit()
  }, FLASH_MS)
}
