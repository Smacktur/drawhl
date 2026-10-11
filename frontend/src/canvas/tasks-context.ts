import { createContext, useContext } from 'react'
import type { Task } from '@/api/tasks'

/** How a card, a Gantt row or a timer points at a task. */
export type TaskLink = { key: string; source?: string }

/** Where a task sits in the lookup; one that names no tracker belongs to the instance's own. */
export function taskRef({ key, source }: TaskLink) {
  return source ? `${source}:${key}` : key
}

/**
 * Tasks by ref, and those of the instance's tracker by bare key as well, which is how
 * cards saved before trackers could be mixed point at them.
 */
export function indexTasks(tasks: Record<string, Task>, defaultSource: string) {
  const index: Record<string, Task> = {}
  for (const task of Object.values(tasks)) {
    index[taskRef(task)] = task
    if (task.source === defaultSource) index[task.key] = task
  }
  return index
}

// Snapshots live outside node data so a refresh never rewrites the board doc.
export const TasksContext = createContext<Record<string, Task>>({})

export function useTask(link: TaskLink): Task | undefined {
  return useContext(TasksContext)[taskRef(link)]
}
