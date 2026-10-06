import { useReactFlow } from '@xyflow/react'
import { X } from 'lucide-react'
import { useRef, useState, type PointerEvent } from 'react'
import type { Milestone as MilestoneData } from '@/modules/gantt/plan'
import { FOOTER, HEADER } from '@/modules/gantt/rows'
import { formatDay, parseDay, type Span } from '@/modules/gantt/timeline'
import { cn } from '@/lib/utils'

type Props = {
  milestone: MilestoneData
  range: Span
  pxPerDay: number
  onChange: (change: Partial<Omit<MilestoneData, 'id'>>) => void
  onRemove: () => void
}

/** A dated checkpoint: a line through the rows and a diamond with its title in the footer lane. */
export function Milestone({ milestone, range, pxPerDay, onChange, onRemove }: Props) {
  const { getZoom } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const drag = useRef<{ x: number; zoom: number; day: number } | null>(null)
  const day = parseDay(milestone.date)
  if (day < range.start || day > range.end) return null
  const x = (day - range.start + 0.5) * pxPerDay

  const down = (event: PointerEvent) => {
    if ((event.target as Element).closest('button, input')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, zoom: getZoom(), day }
  }
  const move = (event: PointerEvent) => {
    const start = drag.current
    if (!start) return
    const days = Math.round((event.clientX - start.x) / start.zoom / pxPerDay)
    const next = Math.min(Math.max(start.day + days, range.start), range.end)
    if (next !== day) onChange({ date: formatDay(next) })
  }
  const stop = () => (drag.current = null)

  return (
    <>
      <div
        className="border-foreground/40 pointer-events-none absolute z-10 w-0 border-l border-dashed"
        style={{ left: x, top: HEADER, bottom: FOOTER / 2 }}
      />
      <div
        data-testid="gantt-milestone"
        title={`${milestone.title || 'Milestone'} · ${milestone.date}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        // The drag captures the pointer, so the double-click lands here and not on the title.
        onDoubleClick={(event) => {
          if (!(event.target as Element).closest('button, input')) setEditing(true)
        }}
        className="group/milestone absolute z-20 flex cursor-ew-resize items-center gap-1 select-none"
        style={{ left: x - 5, bottom: FOOTER / 2 - 5 }}
      >
        <span className="bg-foreground size-2.5 shrink-0 rotate-45 rounded-[1px]" />
        {editing ? (
          <input
            autoFocus
            defaultValue={milestone.title}
            maxLength={200}
            aria-label="Milestone title"
            className="bg-background w-32 rounded-sm border px-1 text-[11px] outline-none"
            onBlur={(event) => {
              setEditing(false)
              if (event.target.value !== milestone.title) onChange({ title: event.target.value })
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            className={cn(
              'bg-background/90 max-w-40 truncate rounded-sm px-0.5 text-[11px] font-medium',
              !milestone.title && 'text-muted-foreground',
            )}
          >
            {milestone.title || 'Milestone'}
          </span>
        )}
        <button
          type="button"
          aria-label={`Remove ${milestone.title || 'milestone'}`}
          title="Remove"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground hidden rounded-sm group-hover/milestone:block"
        >
          <X className="size-3" />
        </button>
      </div>
    </>
  )
}
