import { createContext, useContext } from 'react'
import type { Task } from '@/api/tasks'

// Snapshots live outside node data so a refresh never rewrites the board doc.
export const TasksContext = createContext<Record<string, Task>>({})

export function useTask(key: string): Task | undefined {
  return useContext(TasksContext)[key]
}
