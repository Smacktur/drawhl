import type { XYPosition } from '@xyflow/react'
import type { AppEdge, AppNode } from '@/canvas/types'

function size(node: AppNode) {
  return {
    width: node.measured?.width ?? node.width ?? 0,
    height: node.measured?.height ?? node.height ?? 0,
  }
}

// Parents nest at most twice: a timer on a card in a frame.
export function absolute(node: AppNode, byId: Map<string, AppNode>): XYPosition {
  const parent = node.parentId ? byId.get(node.parentId) : undefined
  if (!parent) return node.position
  const base = absolute(parent, byId)
  return { x: base.x + node.position.x, y: base.y + node.position.y }
}

/** The node on its own at the same place on the board. */
export function detach(node: AppNode, byId: Map<string, AppNode>): AppNode {
  const { parentId: _old, ...rest } = node
  return { ...rest, position: absolute(node, byId) } as AppNode
}

const LAYER = { frame: 0, timer: 2 } as Partial<Record<string, number>>

/**
 * Frames go first and timers last: xyflow needs parents before children,
 * and frames then draw underneath.
 */
export function framesFirst(nodes: AppNode[]): AppNode[] {
  const layer = (node: AppNode) => LAYER[node.type ?? ''] ?? 1
  return nodes.toSorted((a, b) => layer(a) - layer(b))
}

/** Puts each dropped node into the frame under its center, or takes it out of its frame. */
export function reparent(nodes: AppNode[], droppedIds: string[]): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const frames = nodes.filter((n) => n.type === 'frame')
  const dropped = new Set(droppedIds)
  let changed = false

  const next = nodes.map((node) => {
    if (!dropped.has(node.id) || node.type === 'frame' || node.type === 'module') return node
    // A timer on an element goes wherever the element goes.
    if (node.type === 'timer' && node.parentId && byId.get(node.parentId)?.type !== 'frame') {
      return node
    }
    const position = absolute(node, byId)
    const { width, height } = size(node)
    const center = { x: position.x + width / 2, y: position.y + height / 2 }
    const frame = frames.findLast((f) => {
      const box = size(f)
      return (
        center.x >= f.position.x &&
        center.x <= f.position.x + box.width &&
        center.y >= f.position.y &&
        center.y <= f.position.y + box.height
      )
    })
    if (frame?.id === node.parentId) return node
    changed = true
    const { parentId: _old, ...rest } = node
    if (!frame) return { ...rest, position } as AppNode
    return {
      ...rest,
      parentId: frame.id,
      position: { x: position.x - frame.position.x, y: position.y - frame.position.y },
    } as AppNode
  })
  return changed ? framesFirst(next) : nodes
}

/**
 * What a delete really removes: children of a deleted frame stay unless selected themselves,
 * with their timers and edges, unless selected. Null means delete everything as asked.
 */
export function splitDeletion(doomed: AppNode[], doomedEdges: AppEdge[]) {
  const frames = new Set(doomed.filter((n) => n.type === 'frame').map((n) => n.id))
  const keptIds = new Set<string>()
  // Parents come before children, so a kept card is known before its timer.
  for (const node of doomed) {
    if (node.selected || !node.parentId) continue
    if (frames.has(node.parentId) || keptIds.has(node.parentId)) keptIds.add(node.id)
  }
  if (keptIds.size === 0) return null
  const nodes = doomed.filter((n) => !keptIds.has(n.id))
  const removedIds = new Set(nodes.map((n) => n.id))
  return {
    nodes,
    edges: doomedEdges.filter(
      (e) => e.selected || removedIds.has(e.source) || removedIds.has(e.target),
    ),
  }
}

/** Children of removed frames stay on the board at the same place. */
export function releaseChildren(nodes: AppNode[], frameIds: Set<string>): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return nodes.map((node) =>
    node.parentId && frameIds.has(node.parentId) ? detach(node, byId) : node,
  )
}
