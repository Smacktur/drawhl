import { NodeResizer, NodeToolbar, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { EditableText } from '@/canvas/nodes/EditableText'
import { Handles } from '@/canvas/nodes/Handles'
import { STICKY_COLORS, type StickyNode as StickyNodeType } from '@/canvas/types'
import { cn } from '@/lib/utils'

function StickyNodeView({ id, data, selected }: NodeProps<StickyNodeType>) {
  const { updateNodeData } = useReactFlow()
  return (
    <div
      className={cn(
        'h-full w-full rounded-md p-3 text-[14px] leading-[1.35]',
        selected && 'ring-primary ring-2',
      )}
      style={{ background: `var(--sticky-${data.color})`, color: 'var(--sticky-foreground)' }}
    >
      <NodeResizer isVisible={selected} minWidth={80} minHeight={60} />
      <NodeToolbar
        position={Position.Top}
        className="flex gap-1 rounded-md border bg-card p-1 shadow-md"
      >
        {STICKY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} note`}
            aria-pressed={data.color === color}
            onClick={() => updateNodeData(id, { color })}
            className={cn(
              'size-5 rounded-full border',
              data.color === color && 'ring-primary ring-2 ring-offset-1',
            )}
            style={{ background: `var(--sticky-${color})` }}
          />
        ))}
      </NodeToolbar>
      <EditableText
        nodeId={id}
        value={data.text}
        field="text"
        maxLength={5000}
        placeholder="Note"
        className="h-full overflow-hidden"
      />
      <Handles />
    </div>
  )
}

export const StickyNode = memo(StickyNodeView)
