import { expect, test } from 'vitest'
import { framesFirst, releaseChildren, reparent } from '@/canvas/frames'
import type { AppNode } from '@/canvas/types'

const frame: AppNode = {
  id: 'f',
  type: 'frame',
  position: { x: 100, y: 100 },
  width: 400,
  height: 300,
  data: { title: 'Q4' },
}

function card(id: string, x: number, y: number, parentId?: string): AppNode {
  return {
    id,
    type: 'jira_card',
    position: { x, y },
    measured: { width: 100, height: 40 },
    ...(parentId && { parentId }),
    data: { key: 'DEMO-1' },
  }
}

test('a card dropped with its center inside a frame joins it with a relative position', () => {
  const [, moved] = reparent([frame, card('a', 150, 150)], ['a'])
  expect(moved.parentId).toBe('f')
  expect(moved.position).toEqual({ x: 50, y: 50 })
})

test('a card dragged out of its frame is released at its absolute position', () => {
  const [, moved] = reparent([frame, card('a', 450, 50, 'f')], ['a'])
  expect(moved.parentId).toBeUndefined()
  expect(moved.position).toEqual({ x: 550, y: 150 })
})

test('a card outside every frame stays as it is', () => {
  const nodes = [frame, card('a', 900, 900)]
  expect(reparent(nodes, ['a'])).toBe(nodes)
})

test('frames are not nested', () => {
  const inner: AppNode = { ...frame, id: 'g', position: { x: 150, y: 150 }, width: 50, height: 50 }
  const nodes = [frame, inner]
  expect(reparent(nodes, ['g'])).toBe(nodes)
})

test('a frame added after a child keeps the parent-first order', () => {
  const nodes = framesFirst([card('a', 0, 0), frame])
  expect(nodes.map((n) => n.id)).toEqual(['f', 'a'])
})

test('children of a removed frame keep their place on the board', () => {
  const [, released] = releaseChildren([frame, card('a', 50, 50, 'f')], new Set(['f']))
  expect(released.parentId).toBeUndefined()
  expect(released.position).toEqual({ x: 150, y: 150 })
})
