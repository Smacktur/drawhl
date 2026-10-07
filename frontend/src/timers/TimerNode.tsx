import { useOnViewportChange, useReactFlow, useStore, type NodeProps } from '@xyflow/react'
import { AlarmClock, BellRing, Check, Eye } from 'lucide-react'
import { memo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { takeFresh } from '@/canvas/editing'
import type { TimerData, TimerNode as TimerNodeType } from '@/canvas/types'
import { cn } from '@/lib/utils'
import { holderLabel } from './attach'
import { useNow } from './clock'
import { useFlashing } from './fly'
import { formatDue, formatLeft, formatLeftLong } from './time'
import { goesOffAt, timerState, type TimerState } from './timer'
import { TimerEditor } from './TimerEditor'

// A press that moves further than this is a drag, not a click that opens the popover.
const CLICK_SLOP = 4

const ICONS: Record<TimerState, typeof AlarmClock> = {
  running: AlarmClock,
  soon: AlarmClock,
  fired: BellRing,
  done: Check,
  watching: Eye,
}

function hint(data: TimerData, state: TimerState, now: number) {
  const at = goesOffAt(data)
  if (at === null) return 'Waiting'
  if (state === 'fired') return `Went off ${formatDue(at)}`
  if (state === 'done') return 'Done'
  return `${formatDue(at)} · in ${formatLeftLong(at - now)}`
}

function TimerNodeView({ id, data, parentId, selected, dragging }: NodeProps<TimerNodeType>) {
  const now = useNow()
  const { updateNodeData, deleteElements } = useReactFlow()
  const holder = useStore((s) => {
    const parent = parentId ? s.nodeLookup.get(parentId) : undefined
    return parent && holderLabel(parent)
  })
  const flashing = useFlashing(id)
  const [open, setOpen] = useState(() => takeFresh(id))
  const pressedAt = useRef<{ x: number; y: number } | null>(null)
  const state = timerState(data, now)
  const at = goesOffAt(data)
  const Icon = ICONS[state]
  const left = (state === 'running' || state === 'soon') && at !== null ? formatLeft(at - now) : ''

  // The popover is anchored in screen space and would drift away from a panned cube.
  useOnViewportChange({ onStart: () => setOpen(false) })

  const onPointerDown = (event: PointerEvent) => {
    pressedAt.current = { x: event.clientX, y: event.clientY }
  }
  const onClick = (event: MouseEvent) => {
    const start = pressedAt.current
    if (!start || event.shiftKey) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP) return
    setOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onPointerDown={onPointerDown}
          onClick={onClick}
          data-state={state}
          data-flash={flashing || undefined}
          aria-label={`Timer${data.note ? `: ${data.note}` : ''}`}
          className={cn(
            'timer-cube group relative flex size-10 flex-col items-center justify-center gap-0.5 rounded-lg',
            selected && 'ring-primary ring-2 ring-offset-1',
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
          {left && (
            <span className="font-mono text-[11px] leading-none font-semibold tabular-nums">
              {left}
            </span>
          )}
          {!open && !dragging && (
            <span
              role="tooltip"
              className="bg-foreground/80 text-background pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden max-w-72 -translate-x-1/2 flex-col rounded-[4px] px-1.5 py-1 text-[11px] leading-4 whitespace-nowrap group-hover:flex"
            >
              {data.note && <span className="truncate font-semibold">{data.note}</span>}
              <span className="tabular-nums opacity-80">{hint(data, state, now)}</span>
            </span>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent side="right" align="start" className="w-80 p-3">
        <TimerEditor
          data={data}
          holder={holder}
          onChange={(next) => updateNodeData(id, next, { replace: true })}
          onDelete={() => void deleteElements({ nodes: [{ id }] })}
        />
      </PopoverContent>
    </Popover>
  )
}

export const TimerNode = memo(TimerNodeView)
