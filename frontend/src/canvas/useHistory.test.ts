import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useHistory } from '@/canvas/useHistory'
import type { AppEdge, AppNode } from '@/canvas/types'

const card = (id: string, x = 0, extra: Partial<AppNode> = {}): AppNode =>
  ({
    id,
    type: 'jira_card',
    position: { x, y: 0 },
    data: { key: 'DEMO-1', collapsed: false },
    ...extra,
  }) as AppNode

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(initial: AppNode[]) {
  return renderHook(() => {
    const [nodes, setNodes] = useState(initial)
    const [edges, setEdges] = useState<AppEdge[]>([])
    return { nodes, setNodes, edges, setEdges, ...useHistory(nodes, edges, setNodes, setEdges) }
  })
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(500))
const xs = (nodes: AppNode[]) => nodes.map((n) => `${n.id}@${n.position.x}`)

test('undo and redo walk back and forth through settled changes', async () => {
  const { result } = setup([card('a')])
  act(() => result.current.setNodes([card('a', 50)]))
  await settle()
  act(() => result.current.setNodes([card('a', 50), card('b')]))
  await settle()

  act(() => result.current.undo())
  expect(xs(result.current.nodes)).toEqual(['a@50'])
  act(() => result.current.undo())
  expect(xs(result.current.nodes)).toEqual(['a@0'])
  act(() => result.current.undo())
  expect(xs(result.current.nodes)).toEqual(['a@0'])

  act(() => result.current.redo())
  act(() => result.current.redo())
  expect(xs(result.current.nodes)).toEqual(['a@50', 'b@0'])
})

test('a drag is one step and selection is not a step', async () => {
  const { result } = setup([card('a')])
  for (const x of [10, 20, 30]) {
    act(() => result.current.setNodes([card('a', x, { dragging: true })]))
    await settle()
  }
  act(() => result.current.setNodes([card('a', 30, { selected: true })]))
  await settle()
  act(() => result.current.undo())
  expect(xs(result.current.nodes)).toEqual(['a@0'])
})

test('an unsettled change is undone first and a new change clears redo', async () => {
  const { result } = setup([card('a')])
  act(() => result.current.setNodes([card('a', 50)]))
  act(() => result.current.undo())
  expect(xs(result.current.nodes)).toEqual(['a@0'])

  act(() => result.current.setNodes([card('a', 70)]))
  await settle()
  act(() => result.current.redo())
  expect(xs(result.current.nodes)).toEqual(['a@70'])
})

test('undo restores a module content change', async () => {
  const module = (scale: string): AppNode => ({
    id: 'g',
    type: 'module',
    position: { x: 0, y: 0 },
    data: { kind: 'gantt', content: { start: '2026-10-01', end: '2026-12-31', scale } },
  })
  const { result } = setup([module('week')])
  act(() => result.current.setNodes([module('month')]))
  await settle()

  act(() => result.current.undo())
  expect(result.current.nodes[0].data).toEqual(module('week').data)
})
