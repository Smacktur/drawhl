import { normalize } from './match'

export const FIELDS = ['assignee', 'status', 'type', 'priority'] as const
export type Field = (typeof FIELDS)[number]

/** What a task entry is filtered by, as shown. */
export type Facets = Partial<Record<Field, string>>

export type Filter = { field: Field; value: string }

export const MARKERS: Record<Field, string> = {
  assignee: '@',
  status: 'status:',
  type: 'type:',
  priority: 'priority:',
}

export const FIELD_TITLES: Record<Field, string> = {
  assignee: 'Assignee',
  status: 'Status',
  type: 'Type',
  priority: 'Priority',
}

export type Parsed = {
  /** Free text, without filters and the frames mark. */
  text: string
  filters: Filter[]
  /** `#` at the start: only frames and modules. */
  framesOnly: boolean
  /** The filter being typed at the end of the input, for value suggestions. */
  typing?: Filter
}

function fieldOf(token: string): { field: Field; rest: string } | null {
  const lower = token.toLowerCase()
  for (const field of FIELDS) {
    const marker = MARKERS[field]
    if (lower.startsWith(marker)) return { field, rest: token.slice(marker.length) }
  }
  return null
}

const unquote = (value: string) => value.replace(/^"/, '').replace(/"$/, '')

/** Splits on spaces outside quotes: `@"Anna Lee" deploy` → [`@"Anna Lee"`, `deploy`]. */
function tokens(text: string) {
  return text.match(/(?:[^\s"]+|"[^"]*"?)+/g) ?? []
}

/** Reads filters like `@anna`, `status:"in review"`, `type:bug` and a leading `#` out of the input. */
export function parseQuery(input: string): Parsed {
  const all = tokens(input)
  let framesOnly = false
  const words: string[] = []
  const filters: Filter[] = []
  all.forEach((token, i) => {
    if (i === 0 && token.startsWith('#')) {
      framesOnly = true
      token = token.slice(1)
      if (!token) return
    }
    const filter = fieldOf(token)
    if (filter) filters.push({ field: filter.field, value: unquote(filter.rest) })
    else words.push(token)
  })
  const last = all.at(-1)
  const open = (input.match(/"/g)?.length ?? 0) % 2 === 1
  const ended = !open && /\s$/.test(input)
  const lastFilter = last && !ended ? fieldOf(last) : null
  return {
    text: words.join(' '),
    filters,
    framesOnly,
    typing: lastFilter ? { field: lastFilter.field, value: unquote(lastFilter.rest) } : undefined,
  }
}

/** The input without its last token, for replacing a typed filter with a chip. */
export function dropLastToken(input: string) {
  const all = tokens(input)
  const last = all.at(-1)
  if (!last) return input
  return input.slice(0, input.lastIndexOf(last)).trimEnd()
}

/** A chip as text again: `@"Anna Lee"`. */
export function filterText({ field, value }: Filter) {
  return `${MARKERS[field]}${/\s/.test(value) ? `"${value}"` : value}`
}

/** Filters grouped by field with normalized values; values of one field are alternatives. */
export function compileFilters(filters: Filter[]): Map<Field, string[]> {
  const byField = new Map<Field, string[]>()
  for (const { field, value } of filters) {
    byField.set(field, [...(byField.get(field) ?? []), normalize(value)])
  }
  return byField
}

/** True when normalized facets hold one of the values of every filtered field. */
export function passes(facetKeys: Facets | undefined, filters: Map<Field, string[]>) {
  if (filters.size === 0) return true
  if (!facetKeys) return false
  for (const [field, values] of filters) {
    const own = facetKeys[field]
    if (!own || !values.some((value) => own.includes(value))) return false
  }
  return true
}

export type Suggestion = { value: string; count: number }

/** Values of a field on the board that hold the typed part, most used first. */
export function suggest(all: (Facets | undefined)[], typing: Filter, limit = 8): Suggestion[] {
  const counts = new Map<string, number>()
  for (const facets of all) {
    const value = facets?.[typing.field]
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const part = normalize(typing.value)
  return [...counts]
    .filter(([value]) => normalize(value).includes(part))
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit)
}
