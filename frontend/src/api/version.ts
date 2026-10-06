import { z } from 'zod'
import { fetchJson } from '@/api/client'

const versionSchema = z.object({
  version: z.string(),
  latest: z.object({ version: z.string(), url: z.string() }).nullable(),
  update_available: z.boolean(),
})

export type VersionInfo = z.infer<typeof versionSchema>

export function getVersion() {
  return fetchJson('/api/version', versionSchema)
}
