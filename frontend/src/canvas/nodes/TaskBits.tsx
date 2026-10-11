import {
  Bookmark,
  Bug,
  CircleCheck,
  CircleDot,
  GitPullRequest,
  Layers,
  ListTree,
  SquareCheck,
} from 'lucide-react'
import type { Task } from '@/api/tasks'
import { cn } from '@/lib/utils'

const TYPE_ICONS = {
  bug: Bug,
  story: Bookmark,
  task: SquareCheck,
  epic: Layers,
  'sub-task': ListTree,
  subtask: ListTree,
  issue: CircleDot,
  'pull request': GitPullRequest,
}

export function TypeIcon({ typeName }: { typeName: string }) {
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
