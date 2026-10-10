import { useSyncExternalStore } from 'react'
import { z } from 'zod'

/** Colors a person can get; `--presence-0` … `--presence-7` in index.css. */
export const PRESENCE_COLORS = 8
const MAX_SELECTED = 200
export const CURSOR_INTERVAL_MS = 50

const xy = z.object({ x: z.number(), y: z.number() })
const stateSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().max(200),
    color: z
      .number()
      .int()
      .min(0)
      .max(PRESENCE_COLORS - 1),
  }),
  cursor: xy.nullable().catch(null),
  selected: z.array(z.string()).max(MAX_SELECTED).catch([]),
  drag: z.record(z.string(), xy).nullable().catch(null),
})

export type PresenceUser = z.infer<typeof stateSchema>['user']
export type PresenceState = z.infer<typeof stateSchema>
/** Another tab on the board; `client` is its Yjs client id. */
export type Peer = PresenceState & { client: number }

/** The person's color: the same on every screen, because it comes from their id. */
export function colorOf(userId: string): number {
  let hash = 2166136261
  for (let i = 0; i < userId.length; i++) {
    hash = Math.imul(hash ^ userId.charCodeAt(i), 16777619)
  }
  return (hash >>> 0) % PRESENCE_COLORS
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.trim().slice(0, 2)
  return letters.toUpperCase() || '?'
}

/** Every other tab with a readable state; anything a client sent in another shape is skipped. */
export function parsePeers(states: Map<number, unknown>, self: number): Peer[] {
  const peers: Peer[] = []
  for (const [client, raw] of states) {
    if (client === self) continue
    const parsed = stateSchema.safeParse(raw)
    if (parsed.success) peers.push({ ...parsed.data, client })
  }
  return peers.sort((a, b) => a.client - b.client)
}

/** People on the board besides this one: one entry per person, however many tabs they have. */
export function peopleOf(peers: Peer[], me: string | undefined): PresenceUser[] {
  const seen = new Map<string, PresenceUser>()
  for (const peer of peers) {
    if (peer.user.id !== me && !seen.has(peer.user.id)) seen.set(peer.user.id, peer.user)
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function selection(ids: string[]): string[] {
  return ids.slice(0, MAX_SELECTED)
}

/** Runs at once, then at most once per interval with the latest arguments. */
export function throttle<A extends unknown[]>(run: (...args: A) => void, intervalMs: number) {
  let last = -Infinity
  let pending: A | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const fire = (args: A) => {
    last = Date.now()
    pending = null
    run(...args)
  }
  const throttled = (...args: A) => {
    const wait = last + intervalMs - Date.now()
    if (wait <= 0) return fire(args)
    pending = args
    timer ??= setTimeout(() => {
      timer = undefined
      if (pending) fire(pending)
    }, wait)
  }
  throttled.cancel = () => {
    clearTimeout(timer)
    timer = undefined
    pending = null
  }
  return throttled
}

// The canvas publishes who is on the open board; the top bar, in another tree, shows them.
let people: PresenceUser[] = []
const listeners = new Set<() => void>()

export function setBoardPeople(next: PresenceUser[]) {
  if (JSON.stringify(next) === JSON.stringify(people)) return
  people = next
  for (const listener of listeners) listener()
}

const NOBODY: PresenceUser[] = []

export function useBoardPeople() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => people,
    () => NOBODY,
  )
}
