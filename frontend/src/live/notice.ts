import { useSyncExternalStore } from 'react'

// A line the app shows for a while after the board it came from is gone from the screen.
const SHOWN_MS = 8000
let notice: string | null = null
let hide: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

export function setNotice(next: string | null) {
  notice = next
  clearTimeout(hide)
  if (next) hide = setTimeout(() => setNotice(null), SHOWN_MS)
  for (const listener of listeners) listener()
}

export function useNotice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => notice,
    () => null,
  )
}
