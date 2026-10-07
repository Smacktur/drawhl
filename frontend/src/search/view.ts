import { search, type Entry } from './index'
import { otherLayout } from './layout'
import { words } from './match'
import {
  compileFilters,
  parseQuery,
  passes,
  suggest,
  type Facets,
  type Field,
  type Filter,
  type Suggestion,
} from './query'

export type Group = { title?: string; entries: Entry[] }

export type View = {
  groups: Group[]
  /** Values for the filter being typed; the list shows them instead of results. */
  suggestions?: { field: Field; values: Suggestion[] }
  /** Normalized words the rows highlight. */
  query: string[]
  /** Matches past the shown rows. */
  more: number
  /** Nodes of every match, lit on the board; empty without a query. */
  targets: string[]
  /** Set when the query found nothing and the other keyboard layout did. */
  fallback?: string
}

// One value per task: a card and its Gantt row are the same assignee, not two.
// Only tasks that pass the chips count, so suggestions narrow along with the results.
export function taskFacets(index: Entry[], chips: Filter[] = []) {
  const compiled = compileFilters(chips)
  const seen = new Map<string, Facets>()
  for (const entry of index) {
    if (!entry.label || !entry.facets || seen.has(entry.label)) continue
    if (passes(entry.facetKeys, compiled)) seen.set(entry.label, entry.facets)
  }
  return [...seen.values()]
}

/** Values for the filter being typed at the end of the input, if any. */
export function suggestionsFor(facets: Facets[], text: string): View['suggestions'] {
  const typing = parseQuery(text).typing
  return typing && { field: typing.field, values: suggest(facets, typing) }
}

/**
 * What the palette lists for the typed text and chips: recent and frames when empty,
 * value suggestions while a filter is typed, else ranked matches.
 */
export function viewFor(
  index: Entry[],
  text: string,
  recent: string[],
  chips: Filter[] = [],
): View {
  const parsed = parseQuery(text)
  const filters = [...chips, ...parsed.filters]
  const query = words(parsed.text)
  const empty = { query, more: 0, targets: [] }
  if (parsed.typing) {
    return { ...empty, groups: [], suggestions: suggestionsFor(taskFacets(index, chips), text) }
  }
  if (query.length === 0 && filters.length === 0 && !parsed.framesOnly) {
    const byId = new Map(index.map((entry) => [entry.id, entry]))
    const recentEntries = recent.flatMap((id) => byId.get(id) ?? [])
    const frames = index.filter((entry) => entry.kind === 'frame')
    return {
      ...empty,
      groups: [
        { title: 'Recent', entries: recentEntries },
        { title: 'Frames', entries: frames },
      ].filter((group) => group.entries.length > 0),
    }
  }
  const scope = { filters, framesOnly: parsed.framesOnly }
  let found = search(index, query, scope)
  let shown = query
  let fallback: string | undefined
  const other = found.total === 0 && query.length ? otherLayout(parsed.text) : null
  if (other) {
    const alt = search(index, words(other), scope)
    if (alt.total > 0) {
      found = alt
      shown = words(other)
      fallback = other.trim()
    }
  }
  return {
    groups: found.entries.length ? [{ entries: found.entries }] : [],
    query: shown,
    more: found.total - found.entries.length,
    targets: found.targets,
    fallback,
  }
}
