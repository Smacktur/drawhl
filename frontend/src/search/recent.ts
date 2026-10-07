const LIMIT = 5
const storageKey = (boardId: string) => `drawhl.search.recent.${boardId}`

/** Ids of the last jumps on a board, newest first. */
export function readRecent(boardId: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(boardId)) ?? '[]')
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function pushRecent(boardId: string, id: string) {
  const next = [id, ...readRecent(boardId).filter((other) => other !== id)].slice(0, LIMIT)
  try {
    localStorage.setItem(storageKey(boardId), JSON.stringify(next))
  } catch {
    // Private mode or a full quota: recent jumps are a convenience.
  }
}
