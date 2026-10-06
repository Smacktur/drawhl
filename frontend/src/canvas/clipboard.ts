import type { XYPosition } from '@xyflow/react'
import type { Task } from '@/api/tasks'
import { absolute } from '@/canvas/frames'
import type { AppEdge, AppNode } from '@/canvas/types'
import { newId } from '@/lib/id'
import { findModule } from '@/modules/registry'

/** Copied elements: top-level nodes in absolute positions, frame contents relative to their frame. */
export type Snippet = { nodes: AppNode[]; edges: AppEdge[]; tasks: Record<string, Task> }

// In memory rather than the system clipboard, so copied items also paste into another board.
let buffer: Snippet | null = null

export function setClipboard(snippet: Snippet) {
  buffer = snippet
}

export function getClipboard() {
  return buffer
}

function persistent({ id, type, position, width, height, parentId, data }: AppNode): AppNode {
  return {
    id,
    type,
    position: { ...position },
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(parentId !== undefined && { parentId }),
    data: structuredClone(data),
  } as AppNode
}

/** The selection plus everything inside selected frames, and the edges among them. */
export function copySelection(
  nodes: AppNode[],
  edges: AppEdge[],
  tasks: Record<string, Task>,
): Snippet | null {
  const picked = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
  if (picked.size === 0) return null
  for (const node of nodes) if (node.parentId && picked.has(node.parentId)) picked.add(node.id)

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const copied = nodes
    .filter((n) => picked.has(n.id))
    .map((node) => {
      if (node.parentId && picked.has(node.parentId)) return persistent(node)
      const { parentId: _frame, ...rest } = node
      return persistent({ ...rest, position: absolute(node, byId) } as AppNode)
    })
  const cards = copied.flatMap(taskKeys)
  return {
    nodes: copied,
    edges: edges
      .filter((e) => picked.has(e.source) && picked.has(e.target))
      .map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id,
        source,
        target,
        ...(sourceHandle && { sourceHandle }),
        ...(targetHandle && { targetHandle }),
      })),
    tasks: Object.fromEntries(cards.filter((key) => tasks[key]).map((key) => [key, tasks[key]])),
  }
}

function taskKeys(node: AppNode): string[] {
  if (node.type === 'jira_card') return [node.data.key]
  if (node.type !== 'module') return []
  const def = findModule(node.data.kind)
  const parsed = def?.schema.safeParse(node.data.content)
  return def && parsed?.success ? def.keys(parsed.data) : []
}

/** Top-left corner of the snippet's top-level nodes. */
export function snippetOrigin(snippet: Snippet): XYPosition {
  const top = snippet.nodes.filter((n) => !n.parentId)
  return {
    x: Math.min(...top.map((n) => n.position.x)),
    y: Math.min(...top.map((n) => n.position.y)),
  }
}

/** A selected copy with fresh ids, its top-level nodes moved by delta. */
export function cloneSnippet(snippet: Snippet, delta: XYPosition): Snippet {
  const ids = new Map(snippet.nodes.map((n) => [n.id, newId()]))
  return {
    nodes: snippet.nodes.map((node) => ({
      ...persistent(node),
      id: ids.get(node.id)!,
      selected: true,
      ...(node.parentId
        ? { parentId: ids.get(node.parentId) }
        : { position: { x: node.position.x + delta.x, y: node.position.y + delta.y } }),
    })) as AppNode[],
    edges: snippet.edges.map((edge) => ({
      ...edge,
      id: newId(),
      source: ids.get(edge.source)!,
      target: ids.get(edge.target)!,
    })),
    tasks: snippet.tasks,
  }
}
