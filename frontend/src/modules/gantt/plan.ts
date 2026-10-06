import type { GanttContent } from '@/modules/gantt/schema'
import { formatDay, type Day, type Span } from '@/modules/gantt/timeline'
import { newId } from '@/lib/id'

export type Milestone = GanttContent['milestones'][number]
export type Link = GanttContent['links'][number]

export const MAX_MILESTONES = 100
export const MAX_LINKS = 400

export function addMilestone(content: GanttContent, day: Day): GanttContent {
  if (content.milestones.length >= MAX_MILESTONES) return content
  const milestone = { id: newId(), date: formatDay(day), title: 'Milestone' }
  return { ...content, milestones: [...content.milestones, milestone] }
}

export function updateMilestone(
  content: GanttContent,
  id: string,
  change: Partial<Omit<Milestone, 'id'>>,
): GanttContent {
  return {
    ...content,
    milestones: content.milestones.map((m) => (m.id === id ? { ...m, ...change } : m)),
  }
}

export function removeMilestone(content: GanttContent, id: string): GanttContent {
  return { ...content, milestones: content.milestones.filter((m) => m.id !== id) }
}

/** A finish-to-start link; null for a self, duplicate or dangling link, or over the limit. */
export function addLink(content: GanttContent, from: string, to: string): GanttContent | null {
  const ids = new Set(content.rows.map((r) => r.id))
  if (from === to || !ids.has(from) || !ids.has(to)) return null
  if (content.links.length >= MAX_LINKS) return null
  if (content.links.some((l) => l.from === from && l.to === to)) return null
  return { ...content, links: [...content.links, { id: newId(), from, to }] }
}

export function removeLink(content: GanttContent, id: string): GanttContent {
  return { ...content, links: content.links.filter((l) => l.id !== id) }
}

/** The second task starts before the first one is finished. */
export function linkConflict(from: Span, to: Span) {
  return to.start <= from.end
}

// How far a line runs out of a bar before it turns.
const STUB = 8

/**
 * Elbow path from the end of one bar to the start of another, and a point on its middle leg.
 * When the second bar starts left of the first one's end, the line steps out, turns back
 * between the rows and comes in from the left.
 */
export function linkPath(x1: number, y1: number, x2: number, y2: number, rowHeight: number) {
  if (x2 - x1 >= STUB * 2) {
    const turn = x1 + STUB
    return { d: `M ${x1} ${y1} H ${turn} V ${y2} H ${x2}`, mid: { x: turn, y: (y1 + y2) / 2 } }
  }
  const between = y2 === y1 ? y1 + rowHeight / 2 : (y1 + y2) / 2
  return {
    d: `M ${x1} ${y1} h ${STUB} V ${between} H ${x2 - STUB} V ${y2} H ${x2}`,
    mid: { x: (x1 + x2) / 2, y: between },
  }
}
