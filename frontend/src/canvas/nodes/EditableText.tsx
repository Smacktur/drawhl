import { useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import { takeFresh } from '@/canvas/editing'
import { cn } from '@/lib/utils'
import { useReadOnly } from '@/canvas/readonly'

type Props = {
  nodeId: string
  value: string
  field: 'text' | 'title'
  maxLength: number
  placeholder: string
  singleLine?: boolean
  className?: string
}

/** Text shown as is; double-click to edit, blur or Escape to finish. */
export function EditableText({
  nodeId,
  value,
  field,
  maxLength,
  placeholder,
  singleLine,
  className,
}: Props) {
  const { updateNodeData } = useReactFlow()
  const readOnly = useReadOnly()
  const [editing, setEditing] = useState(() => takeFresh(nodeId))
  const [draft, setDraft] = useState(value)

  const start = () => {
    if (readOnly) return
    setDraft(value)
    setEditing(true)
  }
  const finish = () => {
    setEditing(false)
    if (draft !== value) updateNodeData(nodeId, { [field]: draft })
  }

  if (!editing) {
    return (
      <div
        onDoubleClick={start}
        className={cn('break-words whitespace-pre-wrap', !value && 'opacity-50', className)}
      >
        {value || placeholder}
      </div>
    )
  }

  const shared = {
    value: draft,
    maxLength,
    autoFocus: true,
    placeholder,
    'aria-label': placeholder,
    onBlur: finish,
    onFocus: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      event.currentTarget.select(),
    // nodrag and nowheel let the field take mouse input instead of the canvas.
    className: cn('nodrag nowheel w-full resize-none bg-transparent outline-none', className),
  }
  return singleLine ? (
    <input
      {...shared}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
      }}
    />
  ) : (
    <textarea
      {...shared}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.currentTarget.blur()
      }}
      className={cn(shared.className, 'field-sizing-content h-full')}
    />
  )
}
