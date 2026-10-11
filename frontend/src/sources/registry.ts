/** The trackers tiko reads tasks from, as the web app names them. */
const SOURCES: Record<string, { name: string }> = {
  jira: { name: 'Jira' },
  demo: { name: 'the demo tracker' },
}

/** The tracker's name inside a sentence: "Open in Jira". */
export function sourceName(id: string) {
  return SOURCES[id]?.name ?? 'the tracker'
}
