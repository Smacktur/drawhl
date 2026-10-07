import {
  AlarmClock,
  Diamond,
  Frame,
  LayoutTemplate,
  Rows3,
  Search,
  StickyNote,
  Type,
  type LucideIcon,
} from 'lucide-react'
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { TypeIcon } from '@/canvas/nodes/TaskBits'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { formatShortcut, SHORTCUTS } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { findModule } from '@/modules/registry'
import type { Entry } from './index'
import { highlight, snippet, type Range } from './match'
import { viewFor } from './view'

const ICONS: Record<Exclude<Entry['kind'], 'card' | 'module'>, LucideIcon> = {
  sticky: StickyNote,
  text: Type,
  frame: Frame,
  timer: AlarmClock,
  row: Rows3,
  milestone: Diamond,
}

function EntryIcon({ entry }: { entry: Entry }) {
  if (entry.kind === 'card' || entry.typeName) return <TypeIcon typeName={entry.typeName ?? ''} />
  const Icon =
    entry.kind === 'module'
      ? (findModule(entry.module ?? '')?.Icon ?? LayoutTemplate)
      : ICONS[entry.kind]
  return <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
}

function Marked({ text, ranges }: { text: string; ranges: Range[] }) {
  if (ranges.length === 0) return text
  const parts = []
  let at = 0
  for (const [start, end] of ranges) {
    if (start > at) parts.push(text.slice(at, start))
    parts.push(
      <mark key={start} className="bg-primary/15 text-foreground rounded-[2px]">
        {text.slice(start, end)}
      </mark>,
    )
    at = end
  }
  parts.push(text.slice(at))
  return parts
}

function Row({ entry, query }: { entry: Entry; query: string[] }) {
  const text = snippet(entry.text, query)
  return (
    <>
      <EntryIcon entry={entry} />
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate">
        {entry.label && (
          <span className="text-primary shrink-0 font-mono text-[12px]">
            <Marked text={entry.label} ranges={highlight(entry.label, query)} />
          </span>
        )}
        <span className="truncate">
          <Marked text={text.text} ranges={text.ranges} />
        </span>
      </span>
      {entry.context && (
        <span className="text-muted-foreground max-w-[45%] shrink-0 truncate text-[12px]">
          {entry.context}
        </span>
      )}
    </>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  index: Entry[]
  recent: string[]
  onChoose: (entry: Entry) => void
  /** The row picked with the keyboard, after a short rest: the board looks at it. */
  onPreview?: (entry: Entry) => void
  /** Nodes of every match of the current query, lit on the board. */
  onTargets?: (ids: string[]) => void
  onSelectAll?: (ids: string[]) => void
}

// Holding an arrow key skims rows; the board moves only once the pick rests.
const PREVIEW_DELAY_MS = 120

export function SearchPalette({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // The board stays clear behind the palette: matches light up on it and previews move it.
        overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
        className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 shadow-xl sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">Search the board</DialogTitle>
        <PaletteBody onClose={() => onOpenChange(false)} {...rest} />
      </DialogContent>
    </Dialog>
  )
}

const TOGGLE_KEYS = new Set(SHORTCUTS.search.keys.split(',').map((combo) => combo.trim().at(-1)))

function PaletteBody({
  index,
  recent,
  onChoose,
  onPreview,
  onTargets,
  onSelectAll,
  onClose,
}: Omit<Props, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const deferred = useDeferredValue(text)
  const view = useMemo(() => viewFor(index, deferred, recent), [index, deferred, recent])
  const rows = useMemo(() => view.groups.flatMap((group) => group.entries), [view])
  const list = useRef<HTMLDivElement>(null)
  const listId = useId()
  const optionId = (i: number) => `${listId}-${i}`
  const current = Math.min(active, rows.length - 1)
  const picked = rows[current]
  // True once the pick moved by keyboard since the last keystroke in the input.
  const browsing = useRef(false)

  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [current])

  useEffect(() => {
    if (!browsing.current || !picked) return
    const timer = setTimeout(() => onPreview?.(picked), PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [picked, onPreview])

  useEffect(() => onTargets?.(view.targets), [view.targets, onTargets])

  const selectAll = () => {
    if (view.targets.length) onSelectAll?.(view.targets)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step && rows.length) {
      event.preventDefault()
      browsing.current = true
      setActive((current + step + rows.length) % rows.length)
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      selectAll()
    } else if (event.key === 'Enter' && rows[current]) {
      event.preventDefault()
      onChoose(rows[current])
    } else if ((event.metaKey || event.ctrlKey) && TOGGLE_KEYS.has(event.key.toLowerCase())) {
      // The board shortcut is off while a dialog is open, so the palette closes itself.
      event.preventDefault()
      onClose()
    }
  }

  let i = 0
  return (
    <>
      <div className="flex items-center gap-2 border-b px-4">
        <Search aria-hidden className="text-muted-foreground size-4" strokeWidth={1.75} />
        <input
          role="combobox"
          aria-label="Search the board"
          aria-expanded={rows.length > 0}
          aria-controls={listId}
          aria-activedescendant={rows.length ? optionId(current) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search notes, cards, frames, timers…"
          className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent text-[15px] outline-none"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setActive(0)
            browsing.current = false
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {view.fallback && (
        <p className="text-muted-foreground px-4 pt-2 text-[12px]">
          Showing results for <span className="text-foreground">{view.fallback}</span>
        </p>
      )}
      <div
        ref={list}
        id={listId}
        role="listbox"
        aria-label="Results"
        className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5 empty:hidden"
      >
        {view.groups.map((group) => (
          <div key={group.title ?? 'results'} role="group" aria-label={group.title}>
            {group.title && (
              <div className="text-muted-foreground px-2.5 pt-2 pb-1 text-[12px]">
                {group.title}
              </div>
            )}
            {group.entries.map((entry) => {
              const at = i++
              return (
                <div
                  key={`${group.title}:${entry.id}`}
                  id={optionId(at)}
                  data-index={at}
                  role="option"
                  aria-selected={at === current}
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[14px]',
                    at === current && 'bg-accent',
                  )}
                  // Keeps focus in the input, so typing goes on after a click elsewhere in the list.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => {
                    if (at === current) return
                    browsing.current = false
                    setActive(at)
                  }}
                  onClick={() => onChoose(entry)}
                >
                  <Row entry={entry} query={view.query} />
                </div>
              )
            })}
          </div>
        ))}
        {view.more > 0 && (
          <p className="text-muted-foreground px-2.5 py-1.5 text-[12px]">
            {view.more} more. Type more to narrow down.
          </p>
        )}
      </div>
      {rows.length === 0 && (
        <p className="text-muted-foreground px-4 py-6 text-center text-[14px]">
          {view.query.length
            ? `Nothing on this board matches "${deferred.trim()}".`
            : 'Type to find sticky notes, cards, frames, timers and Gantt rows.'}
        </p>
      )}
      <div className="text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-[12px]">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> Move
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> Open
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Esc</Kbd> Close
        </span>
        {onSelectAll && view.targets.length > 0 && (
          <button
            type="button"
            className="hover:text-foreground ml-auto flex items-center gap-1 rounded-sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={selectAll}
          >
            Select all {view.targets.length}
            <Kbd>{formatShortcut('selectMatches')[0].join('')}</Kbd>
          </button>
        )}
      </div>
    </>
  )
}
