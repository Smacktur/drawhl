import { NodeResizer, NodeToolbar, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Puzzle } from 'lucide-react'
import { memo, useCallback } from 'react'
import { Handles } from '@/canvas/nodes/Handles'
import type { ModuleNode as ModuleNodeType } from '@/canvas/types'
import { findModule } from '@/modules/registry'
import { cn } from '@/lib/utils'

const HEADER = 36

function ModuleNodeView({ id, data, selected, width, height }: NodeProps<ModuleNodeType>) {
  const { updateNodeData } = useReactFlow()
  const def = findModule(data.kind)
  const parsed = def?.schema.safeParse(data.content)
  const onChange = useCallback(
    (content: unknown) => updateNodeData(id, { content }),
    [id, updateNodeData],
  )

  const view =
    def && parsed?.success
      ? {
          id,
          content: parsed.data,
          width: width ?? def.size.width,
          height: Math.max((height ?? def.size.height) - HEADER, 0),
          selected: Boolean(selected),
          onChange,
        }
      : null
  const Icon = def?.Icon ?? Puzzle

  return (
    <div
      className={cn(
        'bg-card flex h-full w-full flex-col rounded-md border shadow-sm',
        selected && 'border-primary ring-primary ring-1',
        !view && 'border-dashed',
      )}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={def?.minSize.width ?? 160}
        minHeight={def?.minSize.height ?? 80}
      />
      {view && def?.Controls && (
        <NodeToolbar
          position={Position.Top}
          className="bg-card flex items-center gap-0.5 rounded-md border p-1 shadow-md"
        >
          <def.Controls {...view} />
        </NodeToolbar>
      )}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3 text-[13px] font-medium"
        style={{ height: HEADER }}
      >
        <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
        {def?.name ?? data.kind}
      </div>
      <div className="nodrag nopan relative min-h-0 flex-1 cursor-default">
        {view && def ? (
          <def.View {...view} />
        ) : (
          <p className="text-muted-foreground p-3 text-[13px]">
            {def
              ? 'This module has content this version cannot read.'
              : `Unknown module "${data.kind}". A newer drawhl can show it; it is kept as is.`}
          </p>
        )}
      </div>
      <Handles />
    </div>
  )
}

export const ModuleNode = memo(ModuleNodeView)
