import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { z } from 'zod'

export type ModuleViewProps<C> = {
  id: string
  content: C
  width: number
  height: number
  selected: boolean
  /** Writes the module's content; goes through undo like any board change. */
  onChange: (next: C) => void
}

export type ModuleDef<C> = {
  kind: string
  name: string
  description: string
  Icon: LucideIcon
  size: { width: number; height: number }
  minSize: { width: number; height: number }
  defaults: () => C
  schema: z.ZodType<C>
  /** Live task keys inside the content, refreshed with the board's cards. */
  keys: (content: C) => string[]
  View: ComponentType<ModuleViewProps<C>>
  /** Controls shown above the module while it is selected. */
  Controls?: ComponentType<ModuleViewProps<C>>
}

/** Keeps each definition typed against its own content while the list stays uniform. */
export function defineModule<C>(def: ModuleDef<C>): ModuleDef<unknown> {
  return def as ModuleDef<unknown>
}
