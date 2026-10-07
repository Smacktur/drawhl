import { useSyncExternalStore } from 'react'

// Shared by the board's shortcut and the main menu, which live in different trees.
let open = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSearchOpen(next: boolean) {
  if (open === next) return
  open = next
  for (const listener of listeners) listener()
}

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
