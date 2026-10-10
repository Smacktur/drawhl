import type { XYPosition } from '@xyflow/react'
import type { Peer } from '@/live/presence'

/** Where each node being dragged by someone else is right now, in board coordinates. */
export function remoteDrags(peers: Peer[]): Map<string, XYPosition> {
  const drags = new Map<string, XYPosition>()
  for (const peer of peers) {
    for (const [id, at] of Object.entries(peer.drag ?? {})) drags.set(id, at)
  }
  return drags
}
