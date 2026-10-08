import { z } from 'zod'
import { fetchJson } from '@/api/client'

export const meSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
})
export type Me = z.infer<typeof meSchema>

const statusSchema = z.object({ signed_in: z.boolean(), me: meSchema.nullable() })

export function getAuthStatus() {
  return fetchJson('/api/auth/status', statusSchema)
}

export function signIn(credentials: { username: string; password: string }) {
  return fetchJson('/api/auth/login', z.null(), {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function signOut() {
  return fetchJson('/api/auth/logout', z.null(), { method: 'POST' })
}

export function signOutEverywhere() {
  return fetchJson('/api/auth/logout-all', z.null(), { method: 'POST' })
}

export function updateMe(change: { name?: string; username?: string }) {
  return fetchJson('/api/me', meSchema, { method: 'PATCH', body: JSON.stringify(change) })
}

export function changePassword(change: { current: string; new: string }) {
  return fetchJson('/api/me/password', z.null(), {
    method: 'PUT',
    body: JSON.stringify(change),
  })
}
