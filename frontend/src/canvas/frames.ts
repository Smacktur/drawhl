import type { XYPosition } from '@xyflow/react'
import type { AppNode } from '@/canvas/types'

function size(node: AppNode) {
  return {
    width: node.measured?.width ?? node.width ?? 0,
    height: node.measured?.height ?? node.height ?? 0,
  }
}

// Frames are never nested, so a child's absolute position is one parent away.
function absolute(node: AppNode, byId: Map<string, AppNode>): XYPosition {
  const parent = node.parentId ? byId.get(node.parentId) : undefined
  if (!parent) return node.position
  return { x: parent.position.x + node.position.x, y: parent.position.y + node.position.y }
}

/** Frames go first: xyflow needs parents before children, and frames then draw underneath. */
export function framesFirst(nodes: AppNode[]): AppNode[] {
  return [...nodes.filter((n) => n.type === 'frame'), ...nodes.filter((n) => n.type !== 'frame')]
}

/** Puts each dropped node into the frame under its center, or takes it out of its frame. */
export function reparent(nodes: AppNode[], droppedIds: string[]): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const frames = nodes.filter((n) => n.type === 'frame')
  const dropped = new Set(droppedIds)
  let changed = false

  const next = nodes.map((node) => {
    if (!dropped.has(node.id) || node.type === 'frame') return node
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

/** Children of removed frames stay on the board at the same place. */
export function releaseChildren(nodes: AppNode[], frameIds: Set<string>): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return nodes.map((node) => {
    if (!node.parentId || !frameIds.has(node.parentId)) return node
    const { parentId: _old, ...rest } = node
    return { ...rest, position: absolute(node, byId) } as AppNode
  })
}
