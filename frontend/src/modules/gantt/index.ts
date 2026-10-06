import { ChartGantt } from 'lucide-react'
import { GanttControls, GanttModule } from '@/modules/gantt/GanttModule'
import { ganttDefaults, ganttSchema } from '@/modules/gantt/schema'
import { defineModule } from '@/modules/types'

export const gantt = defineModule({
  kind: 'gantt',
  name: 'Gantt',
  description: 'Plan on a timeline with quarters, months and weeks.',
  Icon: ChartGantt,
  size: { width: 960, height: 320 },
  minSize: { width: 480, height: 200 },
  defaults: ganttDefaults,
  schema: ganttSchema,
  keys: (content) => content.rows.flatMap((row) => (row.key ? [row.key] : [])),
  View: GanttModule,
  Controls: GanttControls,
})
