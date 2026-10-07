import { search, type Entry } from './index'
import { otherLayout } from './layout'
import { words } from './match'

export type Group = { title?: string; entries: Entry[] }

export type View = {
  groups: Group[]
  /** Normalized words the rows highlight. */
  query: string[]
  /** Matches past the shown rows. */
  more: number
  /** Nodes of every match, lit on the board; empty without a query. */
  targets: string[]
  /** Set when the query found nothing and the other keyboard layout did. */
  fallback?: string
}

/** What the palette lists for the typed text: recent and frames when empty, else ranked matches. */
export function viewFor(index: Entry[], text: string, recent: string[]): View {
  const query = words(text)
  if (query.length === 0) {
    const byId = new Map(index.map((entry) => [entry.id, entry]))
    const recentEntries = recent.flatMap((id) => byId.get(id) ?? [])
    const frames = index.filter((entry) => entry.kind === 'frame')
    return {
      groups: [
        { title: 'Recent', entries: recentEntries },
        { title: 'Frames', entries: frames },
      ].filter((group) => group.entries.length > 0),
      query,
      more: 0,
      targets: [],
    }
  }
  let found = search(index, query)
  let shown = query
  let fallback: string | undefined
  const other = found.total === 0 ? otherLayout(text) : null
  if (other) {
    const alt = search(index, words(other))
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
