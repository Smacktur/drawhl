import { NodeResizer, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { EditableText } from '@/canvas/nodes/EditableText'
import { Handles } from '@/canvas/nodes/Handles'
import type { FrameNode as FrameNodeType } from '@/canvas/types'
import { cn } from '@/lib/utils'

function FrameNodeView({ id, data, selected }: NodeProps<FrameNodeType>) {
  // Title sits above the border, like Miro, so it never covers the cards inside.
  return (
    <div
      className={cn(
        'bg-muted/40 relative h-full w-full rounded-md border',
        selected && 'bg-accent border-primary',
      )}
    >
      <NodeResizer isVisible={selected} minWidth={160} minHeight={120} />
      <div className="absolute bottom-full left-0 mb-1 max-w-full text-[13px] font-medium">
        <EditableText
          nodeId={id}
          value={data.title}
          field="title"
          maxLength={200}
          placeholder="Frame"
          singleLine
          className="text-muted-foreground truncate"
        />
      </div>
      <Handles />
    </div>
  )
}

export const FrameNode = memo(FrameNodeView)
