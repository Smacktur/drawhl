import { NodeResizer, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { EditableText } from '@/canvas/nodes/EditableText'
import { Handles } from '@/canvas/nodes/Handles'
import type { TextNode as TextNodeType } from '@/canvas/types'
import { cn } from '@/lib/utils'

function TextNodeView({ id, data, selected }: NodeProps<TextNodeType>) {
  return (
    <div
      className={cn(
        'h-full w-full rounded-sm px-1 text-[16px] leading-[1.35]',
        selected && 'outline-primary outline-1',
      )}
    >
      <NodeResizer isVisible={selected} minWidth={40} minHeight={24} />
      <EditableText
        nodeId={id}
        value={data.text}
        field="text"
        maxLength={5000}
        placeholder="Text"
      />
      <Handles />
    </div>
  )
}

export const TextNode = memo(TextNodeView)
