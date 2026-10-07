import { useSyncExternalStore } from 'react'

// Shared by the board's shortcut and the main menu, which live in different trees.
let open = false
// Text the palette starts with: `>` for commands.
let prefix = ''
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSearchOpen(next: boolean, start = '') {
  if (open === next) return
  open = next
  if (next) prefix = start
  for (const listener of listeners) listener()
}

/** What the palette opened with; read when its input mounts. */
export const searchPrefix = () => prefix

/** Opens the palette on commands and boards only, like `⌘⇧P` in an editor. */
export const COMMANDS_PREFIX = '>'

export function useSearchOpen() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  )
}

// Nodes of the current matches; null while nothing is searched, so the board is not dimmed.
let hits: ReadonlySet<string> | null = null
const hitListeners = new Set<() => void>()

export function setSearchHits(ids: string[] | null) {
  if (!hits && !ids?.length) return
  hits = ids?.length ? new Set(ids) : null
  for (const listener of hitListeners) listener()
}

export function useSearchHits() {
  return useSyncExternalStore(
    (listener) => {
      hitListeners.add(listener)
      return () => hitListeners.delete(listener)
    },
    () => hits,
    () => null,
  )
}
