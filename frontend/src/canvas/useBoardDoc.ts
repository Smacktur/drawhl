import { useEdgesState, useNodesState, type Viewport } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'
import { saveBoard, type Board, type BoardDoc } from '@/api/boards'
import type { AppEdge, AppNode } from '@/canvas/types'

const SAVE_DELAY_MS = 500

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

/** Board state with debounced compare-and-set saves; calls onConflict on a 409. */
export function useBoardDoc(board: Board, onConflict: () => void) {
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

  const flush = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      // Changes made while a save is in flight are picked up by the next iteration.
      while (pending.current !== null) {
        const next = pending.current
        pending.current = null
        if (next === saved.current) continue
        try {
          version.current = await saveBoard(board.id, version.current, JSON.parse(next))
          saved.current = next
          setSaveError(null)
        } catch (error) {
          if (error instanceof ApiError && error.code === 'version_conflict') onConflict()
          else setSaveError(error instanceof Error ? error.message : 'Could not save the board')
          return
        }
      }
    } finally {
      inFlight.current = false
    }
  }, [board.id, onConflict])

  useEffect(() => {
    pending.current = JSON.stringify(toDoc(nodes, edges, viewport))
    const timer = setTimeout(() => void flush(), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [nodes, edges, viewport, flush])

  useEffect(() => {
    const onPageHide = () => {
      const next = pending.current
      if (next !== null && next !== saved.current && !inFlight.current) {
        void saveBoard(board.id, version.current, JSON.parse(next), true).catch(() => {})
      }
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [board.id])

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
