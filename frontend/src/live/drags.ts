import type { XYPosition } from '@xyflow/react'
import type { AppNode } from '@/canvas/types'
import type { Peer } from '@/live/presence'

/** Where each node being dragged by someone else is right now, in board coordinates. */
export function remoteDrags(peers: Peer[]): Map<string, XYPosition> {
  const drags = new Map<string, XYPosition>()
  for (const peer of peers) {
    for (const [id, at] of Object.entries(peer.drag ?? {})) drags.set(id, at)
  }
  return drags
}

/**
 * Nodes as they are drawn while others work: one being dragged by someone follows their
 * pointer, one they just changed glides to its new place. Only what is shown changes; the
 * board itself moves once, when they drop.
 */
export function withRemoteMotion(
  nodes: AppNode[],
  drags: Map<string, XYPosition>,
  glide: ReadonlySet<string>,
  originOf: (parentId: string) => XYPosition | undefined,
): AppNode[] {
  if (drags.size === 0 && glide.size === 0) return nodes
  return nodes.map((node) => {
    const at = node.dragging ? undefined : drags.get(node.id)
    if (!at && !glide.has(node.id)) return node
    const className = [node.className, at ? 'node-glide-drag' : 'node-glide']
      .filter(Boolean)
      .join(' ')
    if (!at) return { ...node, className }
    const origin = (node.parentId && originOf(node.parentId)) || { x: 0, y: 0 }
    return { ...node, className, position: { x: at.x - origin.x, y: at.y - origin.y } }
  })
}
