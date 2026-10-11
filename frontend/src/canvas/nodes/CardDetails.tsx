import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'
import type { Task } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { StatusLozenge, TypeIcon } from '@/canvas/nodes/TaskBits'
import { sourceName } from '@/sources/registry'

type Props = {
  task: Task
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** Mini-card: who has the task, how urgent, when it last moved, and a way to Jira. */
export function CardDetails({ task, collapsed, onToggleCollapsed }: Props) {
  const done = task.status_category === 'done'
  const updated = relativeTime(task.updated)
  const rows: [string, string | null][] = [
    ['Assignee', task.assignee_name ?? 'Unassigned'],
    ['Priority', task.priority_name],
    ['Updated', updated],
  ]

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
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onToggleCollapsed}>
          {collapsed ? <Maximize2 strokeWidth={1.75} /> : <Minimize2 strokeWidth={1.75} />}
          {collapsed ? 'Expand card' : 'Collapse card'}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={task.url} target="_blank" rel="noreferrer">
            <ExternalLink strokeWidth={1.75} />
            Open in {sourceName(task.source)}
          </a>
        </Button>
      </div>
    </div>
  )
}
