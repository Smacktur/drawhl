import { Handle, Position } from '@xyflow/react'

const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
]

// With connectionMode="loose" every handle is both a start and an end of an arrow.
export function Handles() {
  return SIDES.map(({ id, position }) => (
    <Handle key={id} id={id} type="source" position={position} />
  ))
}
