import { useMutation } from '@tanstack/react-query'
import {
  Frame,
  Hand,
  MousePointer2,
  StickyNote,
  TicketPlus,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { resolveTask, type Task } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type Tool = 'select' | 'hand' | 'frame' | 'sticky' | 'text'

const TOOLS: { tool: Tool; label: string; Icon: LucideIcon }[] = [
  { tool: 'select', label: 'Select', Icon: MousePointer2 },
  { tool: 'hand', label: 'Hand', Icon: Hand },
  { tool: 'frame', label: 'Frame', Icon: Frame },
  { tool: 'sticky', label: 'Sticky note', Icon: StickyNote },
  { tool: 'text', label: 'Text', Icon: Type },
]

export function AddCardForm({ onAdd }: { onAdd: (task: Task) => void }) {
  const [ref, setRef] = useState('')
  const resolve = useMutation({ mutationFn: resolveTask, onSuccess: onAdd })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ref.trim()) resolve.mutate(ref.trim())
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="card-ref" className="text-muted-foreground text-[13px]">
        Issue key or link
      </label>
      <Input
        id="card-ref"
        value={ref}
        onChange={(event) => setRef(event.target.value)}
        placeholder="DEMO-1"
        className="h-8"
        autoComplete="off"
        spellCheck={false}
        autoFocus
        disabled={resolve.isPending}
      />
      {resolve.isError && (
        <p role="alert" className="text-destructive text-[13px]">
          {resolve.error.message}
        </p>
      )}
    </form>
  )
}

type Props = {
  tool: Tool
  onTool: (tool: Tool) => void
  onAddCard: (task: Task) => void
}

export function Toolbar({ tool, onTool, onAddCard }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border p-1 shadow-md">
      {TOOLS.map(({ tool: value, label, Icon }) => (
        <Button
          key={value}
          variant={tool === value ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={label}
          aria-pressed={tool === value}
          title={label}
          onClick={() => onTool(value)}
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={open ? 'secondary' : 'ghost'}
            size="icon"
            aria-label="Jira card"
            title="Jira card"
          >
            <TicketPlus className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={10} className="w-72 p-2">
          <AddCardForm
            onAdd={(task) => {
              onAddCard(task)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
