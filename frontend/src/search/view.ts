import { matchCommands, type Command } from './commands'
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
  /** Commands and boards under the board results, grouped by their `group`. */
  commands: Command[]
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
// Under board results the palette offers only the best few commands and boards of each kind.
const COMMANDS_SHOWN = 4

function topCommands(list: Command[]) {
  const byGroup = (group: Command['group']) =>
    list.filter((c) => c.group === group).slice(0, COMMANDS_SHOWN)
  return [...byGroup('Commands'), ...byGroup('Boards')]
}

export function viewFor(
  index: Entry[],
  text: string,
  recent: string[],
  chips: Filter[] = [],
  commands: readonly Command[] = [],
): View {
  const trimmed = text.trimStart()
  // `>` asks for commands and boards only, like a command line.
  if (trimmed.startsWith('>') && chips.length === 0) {
    const query = words(trimmed.slice(1))
    const found = matchCommands(commands, query)
    const ordered = [
      ...found.filter((c) => c.group === 'Commands'),
      ...found.filter((c) => c.group === 'Boards'),
    ]
    return { groups: [], commands: ordered, query, more: 0, targets: [] }
  }
  const parsed = parseQuery(text)
  const filters = [...chips, ...parsed.filters]
  const query = words(parsed.text)
  const empty = { query, more: 0, targets: [], commands: [] }
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
  // Commands only join a plain text query; filters are about the board's tasks.
  const plain = filters.length === 0 && !parsed.framesOnly
  const commandsFor = (q: string[]) => (plain && q.length ? matchCommands(commands, q) : [])
  let found = search(index, query, scope)
  let actions = commandsFor(query)
  let shown = query
  let fallback: string | undefined
  const other =
    found.total === 0 && actions.length === 0 && query.length ? otherLayout(parsed.text) : null
  if (other) {
    const alt = search(index, words(other), scope)
    const altActions = commandsFor(words(other))
    if (alt.total > 0 || altActions.length > 0) {
      found = alt
      actions = altActions
      shown = words(other)
      fallback = other.trim()
    }
  }
  return {
    groups: found.entries.length ? [{ entries: found.entries }] : [],
    commands: topCommands(actions),
    query: shown,
    more: found.total - found.entries.length,
    targets: found.targets,
    fallback,
  }
}
