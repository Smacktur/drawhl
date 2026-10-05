import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { toDoc } from '@/canvas/useBoardDoc'
import type { AppEdge, AppNode } from '@/canvas/types'

const HISTORY_LIMIT = 100
// Changes that settle within this window, like a resize or a burst of edits, are one step.
const SETTLE_MS = 300
const ORIGIN = { x: 0, y: 0, zoom: 1 }

type Snapshot = { nodes: AppNode[]; edges: AppEdge[]; key: string }

// Only what is saved: selection, measuring and the viewport are not undo steps.
function snapshot(nodes: AppNode[], edges: AppEdge[]): Snapshot {
  const doc = toDoc(nodes, edges, ORIGIN)
  return {
    nodes: doc.nodes as AppNode[],
    edges: doc.edges,
    key: JSON.stringify([doc.nodes, doc.edges]),
  }
}

/** Undo and redo of board changes, kept in memory while the board is open. */
export function useHistory(
  nodes: AppNode[],
  edges: AppEdge[],
  setNodes: (nodes: AppNode[]) => void,
  setEdges: (edges: AppEdge[]) => void,
) {
  const current = useRef<Snapshot | null>(null)
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const latest = useRef({ nodes, edges })

  useLayoutEffect(() => {
    latest.current = { nodes, edges }
    current.current ??= snapshot(nodes, edges)
  }, [nodes, edges])

  const commit = useCallback(() => {
    const next = snapshot(latest.current.nodes, latest.current.edges)
    if (!current.current || next.key === current.current.key) return
    past.current = [...past.current, current.current].slice(-HISTORY_LIMIT)
    future.current = []
    current.current = next
  }, [])

  useEffect(() => {
    // A drag is one step, recorded when it ends.
    if (nodes.some((n) => n.dragging)) return
    const timer = setTimeout(commit, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [nodes, edges, commit])

  const step = useCallback(
    (from: RefObject<Snapshot[]>, to: RefObject<Snapshot[]>) => {
      // A change still settling counts as done, so undo takes it back first.
      commit()
      const target = from.current.pop()
      if (!target || !current.current) return
      to.current.push(current.current)
      current.current = target
      setNodes(target.nodes)
      setEdges(target.edges)
    },
    [commit, setNodes, setEdges],
  )

  const undo = useCallback(() => step(past, future), [step])
  const redo = useCallback(() => step(future, past), [step])
  return { undo, redo }
}
