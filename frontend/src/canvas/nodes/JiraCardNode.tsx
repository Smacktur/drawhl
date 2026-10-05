import type { NodeProps } from '@xyflow/react'
import { Bookmark, Bug, CircleCheck, Layers, ListTree, SquareCheck } from 'lucide-react'
import { memo } from 'react'
import type { Task } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { useTask } from '@/canvas/tasks-context'
import type { JiraCardNode as JiraCardNodeType } from '@/canvas/types'

const TYPE_ICONS = {
  bug: Bug,
  story: Bookmark,
  task: SquareCheck,
  epic: Layers,
  'sub-task': ListTree,
  subtask: ListTree,
}

function TypeIcon({ typeName }: { typeName: string }) {
  const Icon = TYPE_ICONS[typeName.toLowerCase() as keyof typeof TYPE_ICONS] ?? CircleCheck
  return <Icon aria-label={typeName || 'Issue'} className="size-3.5 shrink-0" strokeWidth={1.75} />
}

const LOZENGE = {
  new: 'bg-status-new text-status-new-foreground',
  indeterminate: 'bg-status-progress text-status-progress-foreground',
  done: 'bg-status-done text-status-done-foreground',
}

export function StatusLozenge({ task }: { task: Task }) {
  return (
    <span
      className={cn(
        'inline-block max-w-full truncate rounded-[3px] px-1 py-px text-[11px] leading-4 font-semibold tracking-[0.04em] uppercase',
        LOZENGE[task.status_category],
      )}
    >
      {task.status_name}
    </span>
  )
}

function JiraCardNodeView({ data, selected }: NodeProps<JiraCardNodeType>) {
  const task = useTask(data.key)
  const missing = task?.state === 'not_found'
  const done = task?.status_category === 'done'

  return (
    <div
      className={cn(
        'bg-card text-card-foreground flex w-64 flex-col gap-1 rounded-md border px-2 py-1.5 text-[13px] leading-[1.35]',
        selected && 'border-primary ring-primary/30 ring-2',
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1.5">
        {task && <TypeIcon typeName={task.type_name} />}
        <span className={cn('text-primary font-mono text-xs tabular-nums', done && 'line-through')}>
          {data.key}
        </span>
      </div>
      {!task && <span className="text-muted-foreground">Loading…</span>}
      {missing && <span className="text-muted-foreground">Not found or no access</span>}
      {task && !missing && (
        <>
          <span className={cn('line-clamp-2', done && 'text-muted-foreground')}>
            {task.summary}
          </span>
          <div>
            <StatusLozenge task={task} />
          </div>
        </>
      )}
    </div>
  )
}

export const JiraCardNode = memo(JiraCardNodeView)
