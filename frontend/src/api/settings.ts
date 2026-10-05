import { z } from 'zod'
import { fetchJson } from '@/api/client'

const settingsSchema = z.object({
  provider: z.enum(['demo', 'jira']),
  refresh_interval_s: z.number(),
  secret_key_configured: z.boolean(),
  jira: z.object({
    base_url: z.string().nullable(),
    token_state: z.enum(['none', 'set', 'unreadable']),
  }),
})

export type Settings = z.infer<typeof settingsSchema>

export type SettingsChange = {
  provider?: 'demo' | 'jira'
  refresh_interval_s?: number
  // An omitted token keeps the stored one.
  jira?: { base_url: string; token?: string }
}

export function getSettings() {
  return fetchJson('/api/settings', settingsSchema)
}

export function saveSettings(change: SettingsChange) {
  return fetchJson('/api/settings', settingsSchema, {
    method: 'PUT',
    body: JSON.stringify(change),
  })
}

export function testJira(input: { base_url?: string; token?: string }) {
  return fetchJson('/api/settings/jira/test', z.object({ ok: z.boolean(), user: z.string() }), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
