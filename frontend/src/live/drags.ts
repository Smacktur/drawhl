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
  // What sits in a frame, and a timer on a card, is drawn as its own element. It has to move
  // the same way as the element that carries it, or the two come apart on the way.
  const motion = new Map<string, string>()
  for (const node of nodes) {
    if (drags.has(node.id) && !node.dragging) motion.set(node.id, 'node-glide-drag')
    else if (glide.has(node.id)) motion.set(node.id, 'node-glide')
    else if (node.parentId && motion.has(node.parentId)) {
      motion.set(node.id, motion.get(node.parentId)!)
    }
  }
  return nodes.map((node) => {
    const moving = motion.get(node.id)
    if (!moving) return node
    const className = [node.className, moving].filter(Boolean).join(' ')
    const at = node.dragging ? undefined : drags.get(node.id)
    if (!at) return { ...node, className }
    const origin = (node.parentId && originOf(node.parentId)) || { x: 0, y: 0 }
    return { ...node, className, position: { x: at.x - origin.x, y: at.y - origin.y } }
  })
}
