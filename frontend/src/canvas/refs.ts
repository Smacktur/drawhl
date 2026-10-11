import { resolveTask, type Task } from '@/api/tasks'

export const MAX_REFS = 50
// Each key is one request to the tracker; a few at a time stays clear of rate limits.
const CONCURRENCY = 4

export type Resolved = {
  tasks: Task[]
  failed: { ref: string; message: string }[]
  /** Set for a JQL query: how many tasks matched, including the ones past the limit. */
  total?: number
}

const JIRA_KEY = '[A-Za-z][A-Za-z0-9_]+-\\d+'
const GITHUB_REPO = '[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+'
const GITHUB_KEY = `${GITHUB_REPO}#[1-9]\\d*`

export const REF_RE = new RegExp(`^(${JIRA_KEY}|${GITHUB_KEY}|https?://\\S+)$`)
// Only a key or a link to a task page counts on paste, so other links stay text.
const TASK_REF_RE = new RegExp(
  `^(${JIRA_KEY}|${GITHUB_KEY}|https?://\\S+/browse/${JIRA_KEY}/?` +
    `|https?://(www\\.)?github\\.com/${GITHUB_REPO}/(issues|pull)/[1-9]\\d*([/?#]\\S*)?)$`,
)

export function splitRefs(input: string) {
  return [...new Set(input.split(/[\s,;]+/).filter(Boolean))]
}

/** The task refs in pasted text when it holds nothing else, at most `MAX_REFS`. */
export function pastedRefs(text: string): string[] | null {
  const refs = splitRefs(text)
  if (refs.length === 0 || !refs.every((ref) => TASK_REF_RE.test(ref))) return null
  return refs.slice(0, MAX_REFS)
}

export async function resolveAll(refs: string[]): Promise<Resolved> {
  const results: PromiseSettledResult<Task>[] = []
  let next = 0
  const worker = async () => {
    while (next < refs.length) {
      const i = next++
      results[i] = await resolveTask(refs[i]).then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason: unknown) => ({ status: 'rejected', reason }) as const,
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, refs.length) }, worker))
  const resolved: Resolved = { tasks: [], failed: [] }
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') resolved.tasks.push(result.value)
    else resolved.failed.push({ ref: refs[i], message: errorMessage(result.reason) })
  })
  return resolved
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not add the card'
}
