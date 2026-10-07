import type { LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { ShortcutId } from '@/lib/shortcuts'
import { normalize, rank } from './match'

/** Something the palette can run: an app action or a board to open. */
export type Command = {
  id: string
  title: string
  group: 'Commands' | 'Boards'
  Icon: LucideIcon
  shortcut?: ShortcutId
  /** More words that find it: "dark" finds "Switch to dark theme" anyway, "mode" needs a keyword. */
  keywords?: string
  run: () => void
}

// Commands come from the parts of the app that own them: the toolbar, the top bar.
let commands: readonly Command[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCommandList() {
  return useSyncExternalStore(
    subscribe,
    () => commands,
    () => commands,
  )
}

/** Offers commands to the palette while the calling component is mounted. */
export function useCommands(list: Command[]) {
  // The handlers change every render; a ref runs the latest without re-registering.
  const latest = useRef(list)
  useLayoutEffect(() => {
    latest.current = list
  })
  const key = list.map((c) => `${c.id}:${c.title}`).join('|')
  useEffect(() => {
    const own = latest.current.map((c) => ({
      ...c,
      run: () => latest.current.find((next) => next.id === c.id)?.run(),
    }))
    commands = [...commands, ...own]
    emit()
    return () => {
      commands = commands.filter((c) => !own.includes(c))
      emit()
    }
  }, [key])
}

/** Commands whose title or keywords hold every word, best first; all of them for no words. */
export function matchCommands(list: readonly Command[], query: string[]): Command[] {
  if (query.length === 0) return [...list]
  return list
    .map((command, order) => {
      const head = normalize(command.title)
      const haystack = `${head}\n${normalize(command.keywords ?? '')}`
      return { command, order, rank: rank({ haystack, head }, query) }
    })
    .filter((hit) => hit.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map((hit) => hit.command)
}
