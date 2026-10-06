import { useKeyPress, useStoreApi, type InternalNode, type OnNodesChange } from '@xyflow/react'
import { useCallback, useState } from 'react'
import { snap, type Box, type Guide } from '@/canvas/snap'
import type { AppNode } from '@/canvas/types'

// How close in screen pixels an edge must come before it snaps, at any zoom.
const THRESHOLD_PX = 6

function boxOf(node: InternalNode<AppNode>): Box {
  const { x, y } = node.internals.positionAbsolute
  return { x, y, width: node.measured.width ?? 0, height: node.measured.height ?? 0 }
}

const intersects = (p: Box, q: Box) =>
  p.x < q.x + q.width && q.x < p.x + p.width && p.y < q.y + q.height && q.y < p.y + p.height

/** Snaps a node dragged alone to the others on screen and returns the guides to draw; Alt turns it off. */
export function useGuides(onNodesChange: OnNodesChange<AppNode>) {
  const store = useStoreApi<AppNode>()
  const free = useKeyPress('Alt')
  const [guides, setGuides] = useState<Guide[]>([])

  const onChange = useCallback<OnNodesChange<AppNode>>(
    (changes) => {
      const [change] = changes
      const node =
        changes.length === 1 && change.type === 'position' && change.dragging && change.position
          ? store.getState().nodeLookup.get(change.id)
          : undefined
      if (!node || free || change.type !== 'position' || !change.position) {
        setGuides((current) => (current.length ? [] : current))
        return onNodesChange(changes)
      }
      const { nodeLookup, transform, width, height } = store.getState()
      const [tx, ty, zoom] = transform
      const view = { x: -tx / zoom, y: -ty / zoom, width: width / zoom, height: height / zoom }
      const others: Box[] = []
      for (const other of nodeLookup.values()) {
        if (other.id === node.id || other.parentId === node.id || other.hidden) continue
        const box = boxOf(other)
        if (box.width && box.height && intersects(box, view)) others.push(box)
      }
      const parent = node.parentId ? nodeLookup.get(node.parentId) : undefined
      const offset = parent?.internals.positionAbsolute ?? { x: 0, y: 0 }
      const moving = {
        ...boxOf(node),
        x: change.position.x + offset.x,
        y: change.position.y + offset.y,
      }
      const result = snap(moving, others, THRESHOLD_PX / zoom)
      setGuides(result.guides)
      onNodesChange([{ ...change, position: { x: result.x - offset.x, y: result.y - offset.y } }])
    },
    [store, free, onNodesChange],
  )

  return { onNodesChange: onChange, guides }
}
