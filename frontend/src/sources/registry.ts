import jiraMark from '@/sources/marks/jira.svg'

type Source = {
  /** The tracker's name inside a sentence: "Open in Jira". */
  name: string
  /** The tracker's own logo file, shown as it is and never recolored; the demo has none. */
  mark?: string
}

/** The trackers tiko reads tasks from, as the web app names and marks them. */
const SOURCES: Record<string, Source> = {
  jira: { name: 'Jira', mark: jiraMark },
  demo: { name: 'the demo tracker' },
}

export function sourceName(id: string) {
  return SOURCES[id]?.name ?? 'the tracker'
}

export function sourceMark(id: string) {
  return SOURCES[id]?.mark
}

/** Whether this version knows the tracker; a board from a newer tiko may name one it does not. */
export function isKnownSource(id: string) {
  return Object.hasOwn(SOURCES, id)
}
