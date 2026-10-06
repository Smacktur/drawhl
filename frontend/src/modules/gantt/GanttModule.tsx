import { useReactFlow, type XYPosition } from '@xyflow/react'
import { CalendarRange, Plus } from 'lucide-react'
import { useContext, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import type { Task } from '@/api/tasks'
import { keepOpenWhileSuggesting } from '@/canvas/JqlInput'
import { TasksContext } from '@/canvas/tasks-context'
import { AddCardForm } from '@/canvas/Toolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { GanttBar } from '@/modules/gantt/GanttBar'
import { GanttLabel } from '@/modules/gantt/GanttLabel'
import {
  addRows,
  FOOTER,
  HEADER,
  HEADER_ROW,
  LABEL_WIDTH,
  makeRow,
  MAX_ROWS,
  moveRow,
  pxPerDay,
  range,
  removeRow,
  ROW_HEIGHT,
  spanOf,
  updateRow,
  withSpan,
  type Row,
} from '@/modules/gantt/rows'
import type { GanttContent } from '@/modules/gantt/schema'
import {
  fitsRange,
  formatDay,
  header,
  parseDay,
  quarterAfter,
  quarterBefore,
  today,
  type Cell,
  type Scale,
} from '@/modules/gantt/timeline'
import type { ModuleViewProps } from '@/modules/types'
import { cn } from '@/lib/utils'

type Props = ModuleViewProps<GanttContent>

// A label narrower than this would be clipped to nonsense, so the cell stays blank.
const MIN_LABEL_PX = 40
const SCALES: { scale: Scale; label: string }[] = [
  { scale: 'day', label: 'Days' },
  { scale: 'week', label: 'Weeks' },
  { scale: 'month', label: 'Months' },
  { scale: 'quarter', label: 'Quarters' },
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

export function GanttModule({ content, width, selected, onChange, host }: Props) {
  const tasks = useContext(TasksContext)
  const [fresh, setFresh] = useState<string | null>(null)
  const span = range(content)
  const { start, end } = span
  const scale = pxPerDay(content, width)
  const { top, bottom } = header(start, end, content.scale)
  const now = today()
  const before = quarterBefore(start)
  const after = quarterAfter(end)
  const full = content.rows.length >= MAX_ROWS

  const addTasks = (list: Task[]) => {
    host.addTasks(list)
    onChange(
      addRows(
        content,
        list.map((task) => makeRow(content, { key: task.key })),
      ),
    )
  }
  const addPlain = () => {
    const row = makeRow(content, {})
    setFresh(row.id)
    onChange(addRows(content, [row]))
  }
  const eject = (row: Row, screen: XYPosition) => {
    if (row.key) host.ejectCard(row.key, screen)
    else host.ejectNote(row.title, screen)
    onChange(removeRow(content, row.id))
  }

  return (
    <div className="flex h-full text-[12px]">
      <div
        className="relative flex shrink-0 flex-col border-r"
        style={{ width: content.labelWidth }}
      >
        <ColumnResizer
          width={content.labelWidth}
          max={Math.min(LABEL_WIDTH.max, width - LABEL_WIDTH.min)}
          onWidth={(labelWidth) => onChange({ ...content, labelWidth })}
        />
        <div
          className="text-muted-foreground flex shrink-0 items-center border-b px-3"
          style={{ height: HEADER }}
        >
          {formatRange(content.start, content.end)}
        </div>
        {content.rows.map((row, index) => (
          <GanttLabel
            key={row.id}
            row={row}
            index={index}
            task={row.key ? tasks[row.key] : undefined}
            fresh={row.id === fresh}
            onTitle={(title) => onChange(updateRow(content, row.id, (r) => ({ ...r, title })))}
            onRemove={() => onChange(removeRow(content, row.id))}
            onMove={(to) => onChange(moveRow(content, row.id, to))}
            onEject={(screen) => eject(row, screen)}
          />
        ))}
        <div className="mt-auto flex shrink-0 items-center gap-1 px-1" style={{ height: FOOTER }}>
          <AddTaskButton disabled={full} onAdd={addTasks} />
          <Button
            size="sm"
            variant="ghost"
            disabled={full}
            title={full ? `Up to ${MAX_ROWS} rows` : undefined}
            onClick={addPlain}
          >
            <Plus className="size-3.5" />
            Row
          </Button>
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="border-b">
          <HeaderRow cells={top} pxPerDay={scale} top />
          <HeaderRow cells={bottom} pxPerDay={scale} top={false} />
        </div>
        <div className="absolute inset-x-0 bottom-0" style={{ top: HEADER }}>
          {bottom.map((cell) => (
            <div
              key={cell.from}
              className={cn(
                'absolute inset-y-0 border-l border-border/60',
                cell.weekend && 'bg-muted/60',
              )}
              style={{ left: cell.from * scale, width: cell.span * scale }}
            />
          ))}
        </div>
        {now >= start && now <= end && (
          <div
            data-testid="gantt-today"
            title="Today"
            className="bg-primary pointer-events-none absolute bottom-0 z-10 w-px"
            style={{ left: (now - start + 0.5) * scale, top: HEADER }}
          />
        )}
        {content.rows.map((row) => (
          <div
            key={row.id}
            className="relative border-b border-border/60"
            style={{ height: ROW_HEIGHT }}
          >
            <GanttBar
              span={spanOf(row)}
              range={span}
              pxPerDay={scale}
              label={row.key ? `${row.key} ${tasks[row.key]?.summary ?? ''}` : row.title}
              task={row.key ? tasks[row.key] : undefined}
              onSpan={(next) => onChange(updateRow(content, row.id, (r) => withSpan(r, next)))}
            />
          </div>
        ))}
        {content.rows.length === 0 && (
          <p
            className="text-muted-foreground pointer-events-none relative px-3 leading-8"
            style={{ height: ROW_HEIGHT }}
          >
            Drop cards here, or add a task or a row.
          </p>
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

/** Grip on the label column's right border: drag to show more or less of the titles. */
function ColumnResizer({
  width,
  max,
  onWidth,
}: {
  width: number
  max: number
  onWidth: (width: number) => void
}) {
  const { getZoom } = useReactFlow()
  const drag = useRef<{ x: number; width: number; zoom: number } | null>(null)
  const move = (event: PointerEvent) => {
    const start = drag.current
    if (!start) return
    const next = Math.round(start.width + (event.clientX - start.x) / start.zoom)
    const clamped = Math.min(Math.max(next, LABEL_WIDTH.min), max)
    if (clamped !== width) onWidth(clamped)
  }
  const stop = () => (drag.current = null)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the task column"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, width, zoom: getZoom() }
      }}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
      className="hover:bg-primary/40 active:bg-primary absolute inset-y-0 -right-[3px] z-20 w-1.5 cursor-col-resize"
    />
  )
}

function AddTaskButton({ disabled, onAdd }: { disabled: boolean; onAdd: (tasks: Task[]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant={open ? 'secondary' : 'ghost'} disabled={disabled}>
          <Plus className="size-3.5" />
          Task
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-96 p-2"
        onEscapeKeyDown={keepOpenWhileSuggesting}
      >
        <AddCardForm onAdd={onAdd} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
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
