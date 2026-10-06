import { useReactFlow } from '@xyflow/react'
import { GripVertical, X } from 'lucide-react'
import { useRef, useState, type PointerEvent } from 'react'
import type { Task } from '@/api/tasks'
import { TypeIcon } from '@/canvas/nodes/TaskBits'
import { ROW_HEIGHT, type Row } from '@/modules/gantt/rows'
import { cn } from '@/lib/utils'

// A press that moves further than this starts a row drag.
const DRAG_SLOP = 4

type Props = {
  row: Row
  index: number
  task?: Task
  /** A row just added by the user opens with its title in edit mode. */
  fresh?: boolean
  onTitle: (title: string) => void
  onRemove: () => void
  /** Dropped inside the module: the row's new index. */
  onMove: (index: number) => void
  /** Dropped outside the module, at this screen point. */
  onEject: (screen: { x: number; y: number }) => void
}

/** The row's label: drag it to reorder, or out of the module to put it back on the board. */
export function GanttLabel({ row, index, task, fresh, onTitle, onRemove, onMove, onEject }: Props) {
  const { getZoom } = useReactFlow()
  const [offset, setOffset] = useState<number | null>(null)
  const [editing, setEditing] = useState(Boolean(fresh))
  const press = useRef<{ x: number; y: number; zoom: number } | null>(null)

  const down = (event: PointerEvent) => {
    if ((event.target as Element).closest('button, input')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = { x: event.clientX, y: event.clientY, zoom: getZoom() }
  }
  const move = (event: PointerEvent) => {
    const start = press.current
    if (!start) return
    const dy = event.clientY - start.y
    if (offset === null && Math.hypot(event.clientX - start.x, dy) < DRAG_SLOP) return
    setOffset(dy / start.zoom)
  }
  const up = (event: PointerEvent) => {
    const start = press.current
    press.current = null
    if (!start || offset === null) return
    setOffset(null)
    const module = (event.currentTarget as Element).closest('.react-flow__node')
    const box = module?.getBoundingClientRect()
    const inside =
      box &&
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    if (!inside) return onEject({ x: event.clientX, y: event.clientY })
    onMove(index + Math.round(offset / ROW_HEIGHT))
  }

  const done = task?.status_category === 'done'
  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        press.current = null
        setOffset(null)
      }}
      className={cn(
        'group/label flex cursor-grab items-center gap-1.5 border-b border-border/60 pr-1 pl-1 select-none',
        offset !== null && 'bg-card relative z-10 cursor-grabbing shadow-md',
      )}
      style={{
        height: ROW_HEIGHT,
        transform: offset !== null ? `translateY(${offset}px)` : undefined,
      }}
    >
      <GripVertical className="text-muted-foreground/60 size-3.5 shrink-0" />
      {row.key ? (
        <span className={cn('flex min-w-0 items-center gap-1', done && 'text-muted-foreground')}>
          {task && <TypeIcon typeName={task.type_name} />}
          <span className={cn('shrink-0 font-medium', done && 'line-through')}>{row.key}</span>
          <span className="truncate" title={task?.summary}>
            {task?.state === 'not_found' ? 'not found' : task?.summary}
          </span>
        </span>
      ) : editing ? (
        <input
          autoFocus
          defaultValue={row.title}
          maxLength={200}
          aria-label="Row title"
          className="bg-background min-w-0 flex-1 rounded-sm border px-1 outline-none"
          onBlur={(event) => {
            setEditing(false)
            if (event.target.value !== row.title) onTitle(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span
          className={cn('truncate', !row.title && 'text-muted-foreground')}
          onDoubleClick={() => setEditing(true)}
        >
          {row.title || 'Untitled'}
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove ${row.key ?? (row.title || 'row')}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground ml-auto hidden shrink-0 rounded-sm p-0.5 group-hover/label:block"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
