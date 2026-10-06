import { z } from 'zod'
import { fetchJson } from '@/api/client'
import { taskSchema } from '@/api/tasks'

const summarySchema = z.object({ id: z.string(), name: z.string(), updated_at: z.string() })

export type BoardSummary = z.infer<typeof summarySchema>

const xy = z.object({ x: z.number(), y: z.number() })

// The doc mirrors xyflow's node and edge shapes; the backend validates the details.
const docNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['jira_card', 'frame', 'sticky', 'text', 'module']),
  position: xy,
  width: z.number().optional(),
  height: z.number().optional(),
  parentId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
})

const docEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export const docSchema = z.object({
  nodes: z.array(docNodeSchema),
  edges: z.array(docEdgeSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
})

export type BoardDoc = z.infer<typeof docSchema>
export type DocNode = z.infer<typeof docNodeSchema>

const boardSchema = summarySchema.extend({
  version: z.number(),
  doc: docSchema,
  tasks: z.record(z.string(), taskSchema),
})

export type Board = z.infer<typeof boardSchema>

export function listBoards() {
  return fetchJson('/api/boards', z.object({ boards: z.array(summarySchema) })).then(
    (body) => body.boards,
  )
}

export function createBoard(name: string) {
  return fetchJson('/api/boards', summarySchema, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function renameBoard(id: string, name: string) {
  return fetchJson(`/api/boards/${id}`, summarySchema, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function deleteBoard(id: string) {
  return fetchJson(`/api/boards/${id}`, z.null(), { method: 'DELETE' })
}

export function getBoard(id: string) {
  return fetchJson(`/api/boards/${id}`, boardSchema)
}

export function saveBoard(id: string, version: number, doc: BoardDoc, keepalive = false) {
  return fetchJson(`/api/boards/${id}`, z.object({ version: z.number() }), {
    method: 'PUT',
    body: JSON.stringify({ version, doc }),
    keepalive,
  }).then((body) => body.version)
}

const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.enum(['ok', 'error']),
  synced_at: z.string().nullable(),
  error: z
    .object({ code: z.string(), message: z.string(), retry_after: z.number().nullable() })
    .nullable(),
})

export type SyncSource = z.infer<typeof sourceSchema>

const refreshSchema = z.object({
  tasks: z.record(z.string(), taskSchema),
  fetched_at: z.string(),
  sources: z.array(sourceSchema),
})

export function refreshBoard(id: string) {
  return fetchJson(`/api/boards/${id}/refresh`, refreshSchema, { method: 'POST' })
}
