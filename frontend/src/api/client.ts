import { z } from 'zod'

const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})

export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/** Fetches JSON and validates it; throws ApiError with the backend's unified error body. */
export async function fetchJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    throw parsed.success
      ? new ApiError(parsed.data.error.code, parsed.data.error.message)
      : new ApiError('http_error', `request failed with status ${response.status}`)
  }
  return schema.parse(body)
}

const greetingSchema = z.object({ message: z.string() })

export function getGreeting(name: string) {
  return fetchJson(`/api/hello?name=${encodeURIComponent(name)}`, greetingSchema)
}
