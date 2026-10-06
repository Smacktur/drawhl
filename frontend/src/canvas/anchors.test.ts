import { describe, expect, it } from 'vitest'
import { anchorAt, orphanAnchors, raiseAnchors } from '@/canvas/anchors'
import type { AppNode } from '@/canvas/types'

const at = (id: string, type: AppNode['type']) =>
  ({ id, type, position: { x: 0, y: 0 }, data: {} }) as AppNode

describe('anchorAt', () => {
  it('centers the anchor on the drop point', () => {
    expect(anchorAt('p', { x: 0, y: 0 }, { x: 100, y: 50 }).node.position).toEqual({ x: 94, y: 44 })
  })

  it('faces the side the arrow comes from', () => {
    const side = (x: number, y: number) => anchorAt('p', { x: 0, y: 0 }, { x, y }).side
    expect([side(100, 10), side(-100, 10), side(10, 100), side(10, -100)]).toEqual([
      'l',
      'r',
      't',
      'b',
    ])
  })
})

describe('orphanAnchors', () => {
  it('lists only anchors without arrows', () => {
    const nodes = [at('a', 'sticky'), at('p', 'anchor'), at('q', 'anchor')]
    const edges = [{ id: 'e', source: 'a', target: 'p' }]
    expect(orphanAnchors(nodes, edges).map((n) => n.id)).toEqual(['q'])
  })
})

describe('raiseAnchors', () => {
  it('lifts anchors and their arrows above other elements', () => {
    const nodes = [at('a', 'sticky'), at('b', 'sticky'), at('p', 'anchor')]
    const edges = [
      { id: 'e', source: 'a', target: 'p' },
      { id: 'f', source: 'a', target: 'b' },
    ]
    const raised = raiseAnchors(nodes, edges)
    expect(raised.nodes.map((n) => n.zIndex)).toEqual([undefined, undefined, 2000])
    expect(raised.edges.map((e) => e.zIndex)).toEqual([1999, undefined])
  })
})
