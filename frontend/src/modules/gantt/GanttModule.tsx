import { CalendarRange, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { GanttContent } from '@/modules/gantt/schema'
import {
  fitsRange,
  formatDay,
  header,
  parseDay,
  quarterAfter,
  quarterBefore,
  rangeDays,
  today,
  type Cell,
  type Scale,
} from '@/modules/gantt/timeline'
import type { ModuleViewProps } from '@/modules/types'
import { cn } from '@/lib/utils'

type Props = ModuleViewProps<GanttContent>

const LABEL_WIDTH = 160
const HEADER_ROW = 24
// A label narrower than this would be clipped to nonsense, so the cell stays blank.
const MIN_LABEL_PX = 40
const SCALES: { scale: Scale; label: string }[] = [
  { scale: 'day', label: 'Days' },
  { scale: 'week', label: 'Weeks' },
  { scale: 'month', label: 'Months' },
]

function HeaderRow({ cells, pxPerDay, top }: { cells: Cell[]; pxPerDay: number; top: boolean }) {
  return (
    <div className={cn('relative', !top && 'border-t')} style={{ height: HEADER_ROW }}>
      {cells.map((cell) => (
        <div
          key={cell.from}
          className={cn(
            'absolute inset-y-0 truncate border-l px-1.5 leading-6',
            top ? 'text-foreground font-medium' : 'text-muted-foreground',
          )}
          style={{ left: cell.from * pxPerDay, width: cell.span * pxPerDay }}
        >
          {cell.span * pxPerDay >= MIN_LABEL_PX && cell.label}
        </div>
      ))}
    </div>
  )
}

export function GanttModule({ content, width, selected, onChange }: Props) {
  const start = parseDay(content.start)
  const end = parseDay(content.end)
  const pxPerDay = Math.max(width - LABEL_WIDTH, 1) / rangeDays(start, end)
  const { top, bottom } = header(start, end, content.scale)
  const now = today()
  const before = quarterBefore(start)
  const after = quarterAfter(end)

  return (
    <div className="flex h-full text-[12px]">
      <div
        className="text-muted-foreground flex shrink-0 flex-col border-r"
        style={{ width: LABEL_WIDTH }}
      >
        <div className="flex items-center px-3 border-b" style={{ height: HEADER_ROW * 2 }}>
          {formatRange(content.start, content.end)}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="border-b">
          <HeaderRow cells={top} pxPerDay={pxPerDay} top />
          <HeaderRow cells={bottom} pxPerDay={pxPerDay} top={false} />
        </div>
        <div className="absolute inset-x-0 bottom-0" style={{ top: HEADER_ROW * 2 }}>
          {bottom.map((cell) => (
            <div
              key={cell.from}
              className={cn(
                'absolute inset-y-0 border-l border-border/60',
                cell.weekend && 'bg-muted/60',
              )}
              style={{ left: cell.from * pxPerDay, width: cell.span * pxPerDay }}
            />
          ))}
        </div>
        {now >= start && now <= end && (
          <div
            data-testid="gantt-today"
            title="Today"
            className="bg-primary pointer-events-none absolute bottom-0 w-px"
            style={{ left: (now - start + 0.5) * pxPerDay, top: HEADER_ROW * 2 }}
          />
        )}
        {selected && (
          <>
            <QuarterButton
              side="start"
              disabled={!fitsRange(before, end)}
              onClick={() => onChange({ ...content, start: formatDay(before) })}
            />
            <QuarterButton
              side="end"
              disabled={!fitsRange(start, after)}
              onClick={() => onChange({ ...content, end: formatDay(after) })}
            />
          </>
        )}
      </div>
    </div>
  )
}

function QuarterButton({
  side,
  disabled,
  onClick,
}: {
  side: 'start' | 'end'
  disabled: boolean
  onClick: () => void
}) {
  const label = side === 'start' ? 'Add a quarter before' : 'Add a quarter after'
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      title={disabled ? 'The range is limited to 3 years' : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'nodrag nopan absolute top-1/2 size-6 -translate-y-1/2 rounded-full shadow-sm',
        side === 'start' ? '-left-3' : '-right-3',
      )}
    >
      <Plus className="size-3.5" />
    </Button>
  )
}

function formatRange(start: string, end: string) {
  const fmt = (iso: string, year: boolean) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(year && { year: 'numeric' }),
      timeZone: 'UTC',
    })
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`
}

/** Scale switch and range dates, above the module while it is selected. */
export function GanttControls({ content, onChange }: Props) {
  return (
    <>
      {SCALES.map(({ scale, label }) => (
        <Button
          key={scale}
          size="sm"
          variant={content.scale === scale ? 'secondary' : 'ghost'}
          aria-pressed={content.scale === scale}
          onClick={() => onChange({ ...content, scale })}
        >
          {label}
        </Button>
      ))}
      <RangePopover content={content} onChange={onChange} />
    </>
  )
}

function RangePopover({ content, onChange }: Pick<Props, 'content' | 'onChange'>) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ start: content.start, end: content.end })
  const valid =
    Boolean(draft.start && draft.end) && fitsRange(parseDay(draft.start), parseDay(draft.end))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    onChange({ ...content, ...draft })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft({ start: content.start, end: content.end })
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant={open ? 'secondary' : 'ghost'} aria-label="Dates">
          <CalendarRange className="size-4" strokeWidth={1.75} />
          Dates
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3">
        <form onSubmit={submit} className="flex flex-col gap-2">
          {(['start', 'end'] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <Label htmlFor={`gantt-${field}`} className="text-[13px] capitalize">
                {field}
              </Label>
              <Input
                id={`gantt-${field}`}
                type="date"
                value={draft[field]}
                onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
              />
            </div>
          ))}
          {!valid && (
            <p role="alert" className="text-destructive text-[13px]">
              The end must be after the start, at most 3 years apart.
            </p>
          )}
          <Button type="submit" size="sm" disabled={!valid}>
            Apply
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
