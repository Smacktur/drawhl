import { notifyPermission } from '@/focus/alerts'

const KEY = 'drawhl.timers.notified'
// Enough for every timer of a busy board; the oldest are forgotten first.
const LIMIT = 200

/** One alert per timer and moment: a snooze or a new time alerts again. */
export function alertKey(id: string, at: number) {
  return `${id}@${at}`
}

function load(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string') : []
  } catch {
    return []
  }
}

export function wasNotified(key: string) {
  return load().includes(key)
}

export function markNotified(keys: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...load(), ...keys].slice(-LIMIT)))
  } catch {
    // Without storage a reload may alert once more; nothing else breaks.
  }
}

export function notifyTimer(id: string, title: string, body: string, onClick: () => void) {
  if (notifyPermission() !== 'granted') return
  try {
    // The same tag in every tab, so the browser shows one notification.
    const notification = new Notification(title, { body, tag: `drawhl-timer-${id}` })
    notification.onclick = () => {
      window.focus()
      onClick()
      notification.close()
    }
  } catch {
    // Some mobile browsers allow notifications only from a service worker.
  }
}
