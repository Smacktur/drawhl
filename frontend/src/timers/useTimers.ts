import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppNode, TimerNode } from '@/canvas/types'
import { chime, primeAudio } from '@/focus/alerts'
import { alertKey, markNotified, notifyTimer, wasNotified } from './alerts'
import { holderLabel } from './attach'
import { useNow } from './clock'
import { formatClock } from './time'
import { goesOffAt, timerState, type TimerState } from './timer'

export type TimerEntry = {
  id: string
  note: string
  state: TimerState
  /** When it goes off next; null while it waits for a status. */
  at: number | null
  holder?: string
}
export type FiredTimer = TimerEntry & { at: number }

/** Every timer of the board with its state, soonest first. */
export function listTimers(nodes: AppNode[], now: number): TimerEntry[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return nodes
    .filter((n): n is TimerNode => n.type === 'timer')
    .map((n) => {
      const parent = n.parentId ? byId.get(n.parentId) : undefined
      return {
        id: n.id,
        note: n.data.note,
        state: timerState(n.data, now),
        at: goesOffAt(n.data),
        holder: parent && holderLabel(parent),
      }
    })
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity))
}

/**
 * Timers that went off on this board: alerts each once, with a chime and a browser
 * notification while the board is open, quietly for those that went off while it was closed.
 */
export function useTimers(nodes: AppNode[], onOpen: (id: string) => void) {
  const now = useNow()
  const [openedAt] = useState(() => Date.now())
  const [missed, setMissed] = useState(0)
  const onOpenRef = useRef(onOpen)

  const timers = useMemo(() => listTimers(nodes, now), [nodes, now])
  const fired = useMemo(() => timers.filter((t): t is FiredTimer => t.state === 'fired'), [timers])
  const firedKey = fired.map((t) => alertKey(t.id, t.at)).join()
  const firedRef = useRef(fired)

  useEffect(() => {
    onOpenRef.current = onOpen
    firedRef.current = fired
  })

  useEffect(() => {
    const fresh = firedRef.current.filter((t) => !wasNotified(alertKey(t.id, t.at)))
    if (fresh.length === 0) return
    markNotified(fresh.map((t) => alertKey(t.id, t.at)))
    const late = fresh.filter((t) => t.at < openedAt)
    if (late.length > 0) setMissed((count) => count + late.length)
    const live = fresh.filter((t) => t.at >= openedAt)
    if (live.length > 0) chime()
    for (const t of live) {
      const body = [t.holder && `On ${t.holder}`, `Set for ${formatClock(t.at)}`]
      notifyTimer(t.id, t.note || 'Timer', body.filter(Boolean).join(' · '), () =>
        onOpenRef.current(t.id),
      )
    }
    // firedKey changes exactly when the set of timers that went off changes; openedAt never does.
  }, [firedKey, openedAt])

  useEffect(() => {
    const base = document.title
    if (fired.length > 0) document.title = `(${fired.length}) ${base}`
    return () => {
      document.title = base
    }
  }, [fired.length])

  // The chime needs a page gesture first; any click on the page counts.
  useEffect(() => {
    window.addEventListener('pointerdown', primeAudio, { once: true })
    return () => window.removeEventListener('pointerdown', primeAudio)
  }, [])

  return { timers, fired, missed, dismissMissed: () => setMissed(0) }
}
