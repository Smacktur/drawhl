import type { XYPosition } from '@xyflow/react'
import type { GanttContent } from '@/modules/gantt/schema'
import { dayAt, formatDay, newSpan, parseDay, rangeDays, type Span } from '@/modules/gantt/timeline'
import { insertRow, visibleRows } from '@/modules/gantt/tree'
import { newId } from '@/lib/id'

export type Row = GanttContent['rows'][number]

export const LABEL_WIDTH = { min: 120, max: 480 }
export const HEADER_ROW = 24
export const HEADER = HEADER_ROW * 2
export const ROW_HEIGHT = 32
export const FOOTER = 40
export const MAX_ROWS = 200

export function range(content: GanttContent): Span {
  return { start: parseDay(content.start), end: parseDay(content.end) }
}

export function pxPerDay(content: GanttContent, width: number) {
  const { start, end } = range(content)
  return Math.max(width - content.labelWidth, 1) / rangeDays(start, end)
}

/** Body height that shows every visible row, keeping one empty row as a drop target. */
export function bodyHeight(content: GanttContent) {
  return HEADER + Math.max(visibleRows(content.rows).length, 1) * ROW_HEIGHT + FOOTER
}

export function spanOf(row: Row): Span {
  return { start: parseDay(row.start), end: parseDay(row.end) }
}

export function withSpan(row: Row, span: Span): Row {
  return { ...row, start: formatDay(span.start), end: formatDay(span.end) }
}

export function makeRow(
  content: GanttContent,
  fields: { key?: string; title?: string },
  at?: number,
) {
  const span = newSpan(range(content), at)
  return withSpan({ id: newId(), title: '', ...fields, start: '', end: '' }, span)
}

/** Adds rows at the end, skipping tasks already planned here, up to the row limit. */
export function addRows(content: GanttContent, rows: Row[]): GanttContent {
  const keys = new Set(content.rows.map((r) => r.key).filter(Boolean))
  const fresh = rows.filter((r) => !r.key || !keys.has(r.key))
  return { ...content, rows: [...content.rows, ...fresh].slice(0, MAX_ROWS) }
}

export function updateRow(content: GanttContent, id: string, change: (row: Row) => Row) {
  return { ...content, rows: content.rows.map((r) => (r.id === id ? change(r) : r)) }
}

/** A card dropped on the body becomes a row at the drop day and between the rows it fell on. */
export function acceptCard(
  content: GanttContent,
  key: string,
  at: XYPosition,
  width: number,
): GanttContent | null {
  if (content.rows.length >= MAX_ROWS || content.rows.some((r) => r.key === key)) return null
  const day =
    at.x >= content.labelWidth
      ? dayAt(at.x - content.labelWidth, range(content), pxPerDay(content, width))
      : undefined
  // Between the visible rows it fell on, next to the row above it.
  const visible = visibleRows(content.rows)
  const slot = Math.min(Math.max(Math.round((at.y - HEADER) / ROW_HEIGHT), 0), visible.length)
  const before = visible[slot]?.row.id ?? null
  return insertRow(content, makeRow(content, { key }, day), before, visible[slot - 1]?.depth ?? 0)
}
