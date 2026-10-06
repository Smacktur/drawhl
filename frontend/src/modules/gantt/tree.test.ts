import { describe, expect, it } from 'vitest'
import type { GanttContent } from '@/modules/gantt/schema'
import { formatDay } from '@/modules/gantt/timeline'
import {
  addChild,
  indent,
  insertRow,
  liftRemove,
  moveSubtree,
  outdent,
  shiftBranch,
  summarySpan,
  visibleRows,
} from '@/modules/gantt/tree'

type Row = GanttContent['rows'][number]

const row = (id: string, parent?: string, start = '2026-10-05', end = '2026-10-09'): Row => ({
  id,
  title: id,
  start,
  end,
  ...(parent && { parent }),
})

const content = (rows: Row[]): GanttContent => ({
  start: '2026-10-01',
  end: '2026-12-31',
  scale: 'week',
  labelWidth: 160,
  rows,
  milestones: [],
  links: [],
})

// A
//   B
//     C
//   D
// E
const tree = content([row('A'), row('B', 'A'), row('C', 'B'), row('D', 'A'), row('E')])
const shape = (c: GanttContent) => c.rows.map((r) => `${r.id}<${r.parent ?? '-'}`).join(' ')

describe('tree', () => {
  it('lists rows with depth, hiding collapsed subtrees', () => {
    expect(
      visibleRows(tree.rows).map((t) => `${t.row.id}${t.depth}${t.hasChildren ? '+' : ''}`),
    ).toEqual(['A0+', 'B1+', 'C2', 'D1', 'E0'])
    const folded = tree.rows.map((r) => (r.id === 'B' ? { ...r, collapsed: true } : r))
    expect(visibleRows(folded).map((t) => t.row.id)).toEqual(['A', 'B', 'D', 'E'])
  })

  it('spans a parent over its leaves', () => {
    const rows = [
      row('A', undefined, '2027-01-01', '2027-01-02'),
      row('B', 'A', '2026-10-10', '2026-10-12'),
      row('C', 'B', '2026-11-01', '2026-11-20'),
      row('D', 'A', '2026-10-05', '2026-10-06'),
    ]
    const span = summarySpan(rows, 0)!
    expect([formatDay(span.start), formatDay(span.end)]).toEqual(['2026-10-05', '2026-11-20'])
    expect(summarySpan(rows, 3)).toBeNull()
  })

  it('moves a subtree under another row', () => {
    expect(shape(moveSubtree(tree, 'B', 'E', 1))).toBe('A<- D<A B<A C<B E<-')
    expect(shape(moveSubtree(tree, 'E', 'D', 2))).toBe('A<- B<A C<B E<B D<A')
  })

  it('keeps the tree valid when the depth asked for does not fit', () => {
    // Before D (depth 1), a root would orphan D, so the row lands at depth 1.
    expect(shape(moveSubtree(tree, 'E', 'D', 0))).toBe('A<- B<A C<B E<A D<A')
    // Nothing deeper than one level below the row above.
    expect(shape(moveSubtree(tree, 'E', null, 4))).toBe('A<- B<A C<B D<A E<D')
    // Not into its own subtree.
    expect(moveSubtree(tree, 'A', 'C', 3)).toBe(tree)
  })

  it('indents under the row above and outdents after the parent', () => {
    expect(shape(indent(tree, 'E'))).toBe('A<- B<A C<B D<A E<A')
    expect(shape(indent(tree, 'D'))).toBe('A<- B<A C<B D<B E<-')
    expect(shape(outdent(tree, 'C'))).toBe('A<- B<A C<A D<A E<-')
    expect(shape(outdent(tree, 'B'))).toBe('A<- D<A B<- C<B E<-')
  })

  it('adds a child at the end of a subtree and opens the parent', () => {
    const folded = content(tree.rows.map((r) => (r.id === 'A' ? { ...r, collapsed: true } : r)))
    const next = addChild(folded, 'A', row('X'))
    expect(shape(next)).toBe('A<- B<A C<B D<A X<A E<-')
    expect(next.rows[0].collapsed).toBe(false)
  })

  it('shifts a branch by whole days, leaving the rest', () => {
    const next = shiftBranch(tree, 'B', 3)
    expect(next.rows.map((r) => r.start)).toEqual([
      '2026-10-05',
      '2026-10-08',
      '2026-10-08',
      '2026-10-05',
      '2026-10-05',
    ])
  })

  it('lifts children of a removed row one level up', () => {
    expect(shape(liftRemove(tree, 'B'))).toBe('A<- C<A D<A E<-')
    expect(shape(liftRemove(tree, 'A'))).toBe('B<- C<B D<- E<-')
  })

  it('inserts a new row next to the row above', () => {
    expect(shape(insertRow(tree, row('X'), 'D', 0)!)).toBe('A<- B<A C<B X<A D<A E<-')
    expect(shape(insertRow(tree, row('X'), 'E', 0)!)).toBe('A<- B<A C<B D<A X<- E<-')
  })

  it('refuses to go deeper than five levels', () => {
    const deep = content([
      row('0'),
      row('1', '0'),
      row('2', '1'),
      row('3', '2'),
      row('4', '3'),
      row('X'),
    ])
    expect(moveSubtree(deep, 'X', null, 5)).toBe(deep)
    expect(shape(addChild(deep, '4', row('Y')))).toBe(shape(deep))
  })
})
