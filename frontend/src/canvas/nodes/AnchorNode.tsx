import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { AnchorNode as AnchorNodeType } from '@/canvas/types'
import { cn } from '@/lib/utils'

const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
]

// Every side sits at the center, so the arrow tip lands on the point; the side only bends the curve.
function AnchorNodeView({ selected }: NodeProps<AnchorNodeType>) {
  return (
    <div
      className={cn(
        'h-full w-full rounded-full border-[1.5px] border-transparent',
        'hover:border-primary',
        selected && 'border-primary',
      )}
    >
      {SIDES.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          isConnectable={false}
          className="anchor-handle"
        />
      ))}
    </div>
  )
}

export const AnchorNode = memo(AnchorNodeView)
