import type { NodeProps } from '@xyflow/react'
import { Bookmark, Bug, CircleCheck, Layers, ListTree, SquareCheck } from 'lucide-react'
import { memo } from 'react'
import type { Task } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { useTask } from '@/canvas/tasks-context'
import type { JiraCardNode as JiraCardNodeType } from '@/canvas/types'
import { Handles } from '@/canvas/nodes/Handles'

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
        'inline-block rounded-[3px] px-1 align-[1px] text-[11px] leading-4 font-semibold tracking-[0.04em] whitespace-nowrap uppercase',
        LOZENGE[task.status_category],
      )}
    >
      {task.status_name}
    </span>
  )
}

// Long titles are cut so the status lozenge after them always stays visible.
const SUMMARY_LIMIT = 120

function clip(text: string) {
  return text.length > SUMMARY_LIMIT ? `${text.slice(0, SUMMARY_LIMIT).trimEnd()}…` : text
}

function JiraCardNodeView({ data, selected }: NodeProps<JiraCardNodeType>) {
  const task = useTask(data.key)
  const missing = task?.state === 'not_found'
  const done = task?.status_category === 'done'

  // One inline flow, like Confluence's issue macro: wrapped lines start at the left edge.
  return (
    <div
      className={cn(
        'bg-card text-card-foreground w-max max-w-80 rounded-md border px-2 py-1 text-[13px] leading-5',
        selected && 'border-primary ring-primary/30 ring-2',
      )}
    >
      {task && (
        <span className="text-muted-foreground mr-1.5 inline-block align-[-2px]">
          <TypeIcon typeName={task.type_name} />
        </span>
      )}
      <a
        href={task?.url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'text-primary mr-1.5 font-mono text-xs tabular-nums hover:underline',
          done && 'line-through',
        )}
      >
        {data.key}
      </a>
      {!task && <span className="text-muted-foreground">Loading…</span>}
      {missing && <span className="text-muted-foreground">Not found or no access</span>}
      {task && !missing && (
        <>
          <span className={cn('mr-1.5', done && 'text-muted-foreground')}>
            {clip(task.summary)}
          </span>
          <StatusLozenge task={task} />
        </>
      )}
      <Handles />
    </div>
  )
}

export const JiraCardNode = memo(JiraCardNodeView)
