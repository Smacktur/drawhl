import type { XYPosition } from '@xyflow/react'
import type { AnchorNode, AppEdge, AppNode } from '@/canvas/types'

export const ANCHOR_SIZE = 12

/** Anchor centered on the drop point, and its side that faces the arrow's start. */
export function anchorAt(id: string, from: XYPosition, to: XYPosition) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'l' : 'r') : dy > 0 ? 't' : 'b'
  const node: AnchorNode = {
    id,
    type: 'anchor',
    position: { x: to.x - ANCHOR_SIZE / 2, y: to.y - ANCHOR_SIZE / 2 },
    width: ANCHOR_SIZE,
    height: ANCHOR_SIZE,
    data: {},
  }
  return { node, side }
}

/** Anchors no arrow ends at any more: they go away with their last arrow. */
export function orphanAnchors(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
  const used = new Set(edges.flatMap((e) => [e.source, e.target]))
  return nodes.filter((n) => n.type === 'anchor' && !used.has(n.id))
}
