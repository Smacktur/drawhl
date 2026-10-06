import type { XYPosition } from '@xyflow/react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { z } from 'zod'
import type { Task } from '@/api/tasks'

/** What the board does for a module: things that reach outside the module's own content. */
export type ModuleHost = {
  /** Makes freshly resolved tasks show live data before the next refresh. */
  addTasks: (tasks: Task[]) => void
  /** Puts a card for the task on the board at a screen point. */
  ejectCard: (key: string, screen: XYPosition) => void
  /** Puts a sticky note with the text on the board at a screen point. */
  ejectNote: (text: string, screen: XYPosition) => void
}

export type ModuleViewProps<C> = {
  id: string
  content: C
  width: number
  height: number
  selected: boolean
  /** Writes the module's content; goes through undo like any board change. */
  onChange: (next: C) => void
  host: ModuleHost
}

export type ModuleDef<C> = {
  kind: string
  name: string
  description: string
  Icon: LucideIcon
  size: { width: number; height: number }
  minSize: { width: number; height: number }
  /** Body height the content needs; the block grows to it so nothing is hidden. */
  minHeight?: (content: C) => number
  defaults: () => C
  schema: z.ZodType<C>
  /** Live task keys inside the content, refreshed with the board's cards. */
  keys: (content: C) => string[]
  View: ComponentType<ModuleViewProps<C>>
  /** Controls shown above the module while it is selected. */
  Controls?: ComponentType<ModuleViewProps<C>>
  /**
   * Takes in a card dropped at a point of the body (module coordinates, below the header).
   * Null leaves the card on the board.
   */
  acceptCard?: (content: C, key: string, at: XYPosition, width: number) => C | null
}

/** Keeps each definition typed against its own content while the list stays uniform. */
export function defineModule<C>(def: ModuleDef<C>): ModuleDef<unknown> {
  return def as ModuleDef<unknown>
}
