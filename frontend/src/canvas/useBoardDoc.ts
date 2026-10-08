import { useEdgesState, useNodesState, type Viewport } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { saveBoard, type Board, type BoardDoc } from '@/api/boards'
import type { AppEdge, AppNode } from '@/canvas/types'

const SAVE_DELAY_MS = 500
const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 30_000
const KEEPALIVE_LIMIT = 60_000

// Only persistent fields: xyflow adds selected, dragging, measured and more at runtime.
export function toDoc(nodes: AppNode[], edges: AppEdge[], viewport: Viewport): BoardDoc {
  return {
    nodes: nodes.map(({ id, type, position, width, height, parentId, data }) => ({
      id,
      type: type ?? 'jira_card',
      position: { x: position.x, y: position.y },
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(parentId !== undefined && { parentId }),
      data,
    })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
      id,
      source,
      target,
      ...(sourceHandle && { sourceHandle }),
      ...(targetHandle && { targetHandle }),
    })),
    viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
  }
}

/** Board state with debounced compare-and-set saves; calls onConflict on a 409.
 *
 * A read-only board never saves; a 403 means the role changed and calls onForbidden.
 */
export function useBoardDoc(
  board: Board,
  onConflict: () => void,
  readOnly = false,
  onForbidden: () => void = () => {},
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(board.doc.nodes as AppNode[])
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>(board.doc.edges)
  const [viewport, setViewport] = useState<Viewport>(board.doc.viewport)
  const [saveError, setSaveError] = useState<string | null>(null)

  const version = useRef(board.version)
  // Normalized like every later save, so opening a board does not trigger a write.
  const saved = useRef(
    JSON.stringify(toDoc(board.doc.nodes as AppNode[], board.doc.edges, board.doc.viewport)),
  )
  const pending = useRef<string | null>(null)
  const inFlight = useRef(false)
  const failures = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flushRef = useRef<() => Promise<void>>(async () => {})

  const flush = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearTimeout(retryTimer.current)
    try {
      // Changes made while a save is in flight are picked up by the next iteration.
      while (pending.current !== null) {
        const next = pending.current
        pending.current = null
        if (next === saved.current) continue
        try {
          // keepalive lets the last save finish when the tab closes; browsers cap it at 64 KiB.
          const keepalive = next.length < KEEPALIVE_LIMIT
          version.current = await saveBoard(board.id, version.current, JSON.parse(next), keepalive)
          saved.current = next
          failures.current = 0
          setSaveError(null)
        } catch (error) {
          if (error instanceof ApiError && error.code === 'version_conflict') {
            onConflict()
            return
          }
          if (error instanceof ApiError && error.code === 'forbidden') {
            onForbidden()
            return
          }
          pending.current ??= next
          failures.current += 1
          setSaveError(error instanceof Error ? error.message : 'Could not save the board')
          const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures.current - 1))
          retryTimer.current = setTimeout(() => void flushRef.current(), delay)
          return
        }
      }
    } finally {
      inFlight.current = false
    }
  }, [board.id, onConflict, onForbidden])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  useEffect(() => {
    if (readOnly) {
      pending.current = null
      return
    }
    pending.current = JSON.stringify(toDoc(nodes, edges, viewport))
    const timer = setTimeout(() => void flush(), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [nodes, edges, viewport, flush, readOnly])

  // Save right away when the tab is hidden or closed, or the board is switched.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushRef.current()
    }
    const onPageHide = () => void flushRef.current()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      clearTimeout(retryTimer.current)
      void flushRef.current()
    }
  }, [])

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    setViewport,
    saveError,
  }
}
