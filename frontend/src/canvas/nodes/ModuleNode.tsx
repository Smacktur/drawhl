import { NodeResizer, NodeToolbar, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Puzzle } from 'lucide-react'
import { memo, useCallback, useContext, useEffect } from 'react'
import { MODULE_HEADER as HEADER } from '@/canvas/modules'
import { EditableText } from '@/canvas/nodes/EditableText'
import { Handles } from '@/canvas/nodes/Handles'
import type { ModuleNode as ModuleNodeType } from '@/canvas/types'
import { ModuleHostContext } from '@/modules/host-context'
import { findModule } from '@/modules/registry'
import { cn } from '@/lib/utils'

function ModuleNodeView({ id, data, selected, width, height }: NodeProps<ModuleNodeType>) {
  const { updateNodeData, updateNode } = useReactFlow()
  const host = useContext(ModuleHostContext)
  const def = findModule(data.kind)
  const parsed = def?.schema.safeParse(data.content)
  const onChange = useCallback(
    (content: unknown) => updateNodeData(id, { content }),
    [id, updateNodeData],
  )

  const content = parsed?.success ? parsed.data : undefined
  const minHeight = HEADER + (content !== undefined && def?.minHeight ? def.minHeight(content) : 0)
  const tooShort = height !== undefined && height < minHeight

  // New rows grow the block instead of hiding behind its bottom edge.
  useEffect(() => {
    if (tooShort) updateNode(id, { height: minHeight })
  }, [id, tooShort, minHeight, updateNode])

  const view =
    def && content !== undefined
      ? {
          id,
          content,
          width: width ?? def.size.width,
          height: Math.max((height ?? def.size.height) - HEADER, 0),
          selected: Boolean(selected),
          onChange,
          host,
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
        minHeight={Math.max(def?.minSize.height ?? 80, minHeight)}
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
        <EditableText
          nodeId={id}
          value={data.title ?? ''}
          field="title"
          maxLength={200}
          placeholder={def?.name ?? data.kind}
          singleLine
          className="min-w-0 flex-1 truncate"
        />
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
