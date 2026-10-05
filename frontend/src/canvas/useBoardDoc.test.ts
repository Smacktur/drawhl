import { expect, test } from 'vitest'
import { toDoc } from '@/canvas/useBoardDoc'
import type { AppNode } from '@/canvas/types'

test('toDoc keeps only persistent fields', () => {
  const node = {
    id: 'a',
    type: 'jira_card',
    position: { x: 1, y: 2 },
    data: { key: 'DEMO-1', collapsed: false },
    selected: true,
    dragging: false,
    measured: { width: 256, height: 80 },
  } as AppNode
  const doc = toDoc([node], [], { x: 0, y: 0, zoom: 1 })
  expect(doc.nodes).toEqual([
    {
      id: 'a',
      type: 'jira_card',
      position: { x: 1, y: 2 },
      data: { key: 'DEMO-1', collapsed: false },
    },
  ])
})
