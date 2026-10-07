import { useSyncExternalStore } from 'react'

// One ticker for every timer on the board; it runs only while something shows a timer.
let now = Date.now()
const listeners = new Set<() => void>()
let ticker: ReturnType<typeof setInterval> | undefined

function tick() {
  now = Date.now()
  for (const listener of listeners) listener()
}

// Background tabs throttle the interval; coming back shows the right time at once.
function onVisible() {
  if (document.visibilityState === 'visible') tick()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!ticker) {
    now = Date.now()
    ticker = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', onVisible)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return
    clearInterval(ticker)
    ticker = undefined
    document.removeEventListener('visibilitychange', onVisible)
  }
}

// With no ticker running the stored time is stale; whole seconds keep repeated reads equal.
function snapshot() {
  if (!ticker) now = Math.floor(Date.now() / 1000) * 1000
  return now
}

/** Current time, updated once a second. */
export function useNow() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
