import { gantt } from '@/modules/gantt'
import type { ModuleDef } from '@/modules/types'

export const MODULES: ModuleDef<unknown>[] = [gantt]

export function findModule(kind: string) {
  return MODULES.find((m) => m.kind === kind)
}
