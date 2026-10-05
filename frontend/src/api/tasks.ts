import { z } from 'zod'
import { fetchJson } from '@/api/client'

export const taskSchema = z.object({
  key: z.string(),
  state: z.enum(['ok', 'not_found']),
  summary: z.string(),
  status_name: z.string(),
  status_category: z.enum(['new', 'indeterminate', 'done']),
  type_name: z.string(),
  assignee_name: z.string().nullable(),
  priority_name: z.string().nullable(),
  updated: z.string().nullable(),
  url: z.string(),
  fetched_at: z.string(),
})

export type Task = z.infer<typeof taskSchema>

export function resolveTask(ref: string) {
  return fetchJson('/api/tasks/resolve', z.object({ task: taskSchema }), {
    method: 'POST',
    body: JSON.stringify({ ref }),
  }).then((body) => body.task)
}
