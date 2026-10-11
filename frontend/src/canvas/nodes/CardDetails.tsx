import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'
import type { Task } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { StatusLozenge, TypeIcon } from '@/canvas/nodes/TaskBits'
import { sourceName } from '@/sources/registry'
import { SourceMark } from '@/sources/SourceMark'

type Props = {
  task: Task
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** Black or white, whichever reads on the label's own color (the rule GitHub uses). */
function textOn(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000' : '#fff'
}

function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <li
      className={cn(
        'rounded-full border border-black/10 px-1.5 text-[11px] leading-4 font-medium dark:border-white/15',
        !color && 'bg-muted text-muted-foreground',
      )}
      style={color ? { backgroundColor: `#${color}`, color: textOn(color) } : undefined}
    >
      {name}
    </li>
  )
}

/** Mini-card: who has the task, when it last moved, what its tracker adds, and a way there. */
export function CardDetails({ task, collapsed, onToggleCollapsed }: Props) {
  const done = task.status_category === 'done'
  const updated = relativeTime(task.updated)
  const rows: [string, string | null][] = [
    ['Assignee', task.assignee_name ?? 'Unassigned'],
    // A tracker without priorities gets no empty row.
    ...(task.priority_name ? [['Priority', task.priority_name] as [string, string]] : []),
    ['Updated', updated],
    ...(task.rows ?? []).map((row): [string, string] => [row.label, row.value]),
  ]
  const labels = task.labels ?? []

  return (
    <div className="flex flex-col gap-2.5 text-[13px] leading-5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">
          <TypeIcon typeName={task.type_name} />
        </span>
        <span className={cn('text-primary font-mono text-xs tabular-nums', done && 'line-through')}>
          {task.key}
        </span>
        <StatusLozenge task={task} />
      </div>
      <p className={cn('text-sm leading-[1.35]', done && 'text-muted-foreground')}>
        {task.summary}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
              className={cn(!value && 'text-muted-foreground')}
              title={label === 'Updated' && task.updated ? task.updated : undefined}
            >
              {value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>
      {labels.length > 0 && (
        <ul aria-label="Labels" className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <LabelChip key={label.name} {...label} />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onToggleCollapsed}>
          {collapsed ? <Maximize2 strokeWidth={1.75} /> : <Minimize2 strokeWidth={1.75} />}
          {collapsed ? 'Expand card' : 'Collapse card'}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={task.url} target="_blank" rel="noreferrer">
            <SourceMark source={task.source} />
            Open in {sourceName(task.source)}
            <ExternalLink strokeWidth={1.75} />
          </a>
        </Button>
      </div>
    </div>
  )
}
