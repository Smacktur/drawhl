import { expect, test } from 'vitest'
import {
  addLink,
  addMilestone,
  linkConflict,
  linkPath,
  MAX_MILESTONES,
  removeLink,
  removeMilestone,
  updateMilestone,
} from '@/modules/gantt/plan'
import type { GanttContent } from '@/modules/gantt/schema'
import { liftRemove } from '@/modules/gantt/tree'
import { parseDay } from '@/modules/gantt/timeline'

const content: GanttContent = {
  start: '2026-10-01',
  end: '2026-12-31',
  scale: 'week',
  labelWidth: 160,
  rows: [
    { id: 'a', title: 'Build', start: '2026-10-05', end: '2026-10-09' },
    { id: 'b', title: 'Ship', start: '2026-10-12', end: '2026-10-14' },
  ],
  milestones: [],
  links: [],
}

test('a milestone is added on the day, renamed, moved and removed', () => {
  const added = addMilestone(content, parseDay('2026-11-15'))
  const [milestone] = added.milestones
  expect(milestone).toMatchObject({ date: '2026-11-15', title: 'Milestone' })
  const renamed = updateMilestone(added, milestone.id, { title: 'Beta', date: '2026-11-20' })
  expect(renamed.milestones[0]).toMatchObject({ title: 'Beta', date: '2026-11-20' })
  expect(removeMilestone(renamed, milestone.id).milestones).toEqual([])
})

test('milestones stop at the limit', () => {
  const milestones = Array.from({ length: MAX_MILESTONES }, (_, i) => ({
    id: `m${i}`,
    date: '2026-10-01',
    title: '',
  }))
  const full = { ...content, milestones }
  expect(addMilestone(full, parseDay('2026-10-02'))).toBe(full)
})

test('a link joins two rows once, never a row to itself', () => {
  const linked = addLink(content, 'a', 'b')!
  expect(linked.links).toEqual([{ id: expect.any(String), from: 'a', to: 'b' }])
  expect(addLink(linked, 'a', 'b')).toBeNull()
  expect(addLink(content, 'a', 'a')).toBeNull()
  expect(addLink(content, 'a', 'missing')).toBeNull()
  expect(addLink(linked, 'b', 'a')?.links).toHaveLength(2)
  expect(removeLink(linked, linked.links[0].id).links).toEqual([])
})

test('removing a row drops its links', () => {
  const linked = addLink(content, 'a', 'b')!
  expect(liftRemove(linked, 'b').links).toEqual([])
})

test('a link conflicts when the next task starts before the first one ends', () => {
  expect(linkConflict({ start: 0, end: 4 }, { start: 5, end: 9 })).toBe(false)
  expect(linkConflict({ start: 0, end: 4 }, { start: 4, end: 9 })).toBe(true)
  expect(linkConflict({ start: 0, end: 4 }, { start: 1, end: 2 })).toBe(true)
})

test('a link runs straight across when there is room and loops back when there is not', () => {
  expect(linkPath(10, 16, 60, 48, 32)).toEqual({
    d: 'M 10 16 H 18 V 48 H 60',
    mid: { x: 18, y: 32 },
  })
  expect(linkPath(60, 16, 10, 48, 32)).toEqual({
    d: 'M 60 16 h 8 V 32 H 2 V 48 H 10',
    mid: { x: 35, y: 32 },
  })
})
