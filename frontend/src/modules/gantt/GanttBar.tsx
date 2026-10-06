import { useReactFlow } from '@xyflow/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type PointerEvent } from 'react'
import type { Task } from '@/api/tasks'
import { TypeIcon } from '@/canvas/nodes/TaskBits'
import { barBox, dragSpan, type Grip, type Span } from '@/modules/gantt/timeline'
import { cn } from '@/lib/utils'

const BAR_COLOR = {
  new: 'bg-status-new text-status-new-foreground',
  indeterminate: 'bg-status-progress text-status-progress-foreground',
  done: 'bg-status-done text-status-done-foreground',
}

type Props = {
  span: Span
  range: Span
  pxPerDay: number
  label: string
  /** Undefined for a plain row; a task row without data yet is drawn like a plain one. */
  task?: Task
  onSpan: (span: Span) => void
}

/** A row's bar: drag the body to move it, an end to change that date, in whole days. */
export function GanttBar({ span, range, pxPerDay, label, task, onSpan }: Props) {
  const { getZoom } = useReactFlow()
  const drag = useRef<{ x: number; zoom: number; grip: Grip; span: Span } | null>(null)
  const box = barBox(span, range, pxPerDay)

  if (!box) {
    const before = span.end < range.start
    const Icon = before ? ChevronLeft : ChevronRight
    return (
      <span
        title={before ? 'Before the range' : 'After the range'}
        className={cn('text-muted-foreground absolute top-2', before ? 'left-0' : 'right-0')}
      >
        <Icon className="size-4" />
      </span>
    )
  }

  const start = (grip: Grip) => (event: PointerEvent) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, zoom: getZoom(), grip, span }
  }
  const move = (event: PointerEvent) => {
    const current = drag.current
    if (!current) return
    const days = Math.round((event.clientX - current.x) / current.zoom / pxPerDay)
    const next = dragSpan(current.span, current.grip, days)
    if (next.start !== span.start || next.end !== span.end) onSpan(next)
  }
  const stop = () => (drag.current = null)
  // Grips capture the pointer themselves; their moves bubble up to the bar's handlers.
  const handlers = { onPointerMove: move, onPointerUp: stop, onPointerCancel: stop }

  const missing = task?.state === 'not_found'
  return (
    <div
      role="slider"
      aria-label={`${label} dates`}
      aria-valuetext={label}
      onPointerDown={start('move')}
      {...handlers}
      className={cn(
        'absolute top-1.5 flex h-5 cursor-grab items-center overflow-hidden rounded-[4px] px-1.5 text-[11px] leading-5 font-medium whitespace-nowrap select-none active:cursor-grabbing',
        task && !missing
          ? BAR_COLOR[task.status_category]
          : task
            ? 'bg-secondary text-secondary-foreground border'
            : 'bg-card text-card-foreground border',
        missing && 'border-dashed opacity-70',
        task?.status_category === 'done' && 'line-through',
        box.clippedStart && 'rounded-l-none',
        box.clippedEnd && 'rounded-r-none',
      )}
      style={{ left: box.left, width: Math.max(box.width, 4) }}
      title={task && !missing ? `${label} · ${task.status_name}` : label}
    >
      {task && !missing && (
        <span className="mr-1 opacity-80">
          <TypeIcon typeName={task.type_name} />
        </span>
      )}
      <span className="truncate">{label}</span>
      {!box.clippedStart && (
        <span
          aria-hidden
          onPointerDown={start('start')}
          className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
        />
      )}
      {!box.clippedEnd && (
        <span
          aria-hidden
          onPointerDown={start('end')}
          className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
        />
      )}
    </div>
  )
}
