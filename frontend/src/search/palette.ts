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
