import { z } from 'zod'
import { fetchJson } from '@/api/client'

const statusSchema = z.object({ signed_in: z.boolean() })

export function getAuthStatus() {
  return fetchJson('/api/auth/status', statusSchema)
}

export function signIn(password: string) {
  return fetchJson('/api/auth/login', z.null(), {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function signOut() {
  return fetchJson('/api/auth/logout', z.null(), { method: 'POST' })
}
