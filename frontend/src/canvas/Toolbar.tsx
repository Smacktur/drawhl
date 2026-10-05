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
import { SHORTCUTS, useShortcut, withShortcut } from '@/lib/shortcuts'

export type Tool = 'select' | 'hand' | 'frame' | 'sticky' | 'text'

const TOOLS: { tool: Tool; Icon: LucideIcon }[] = [
  { tool: 'select', Icon: MousePointer2 },
  { tool: 'hand', Icon: Hand },
  { tool: 'frame', Icon: Frame },
  { tool: 'sticky', Icon: StickyNote },
  { tool: 'text', Icon: Type },
]

const MAX_REFS = 50

type Resolved = { tasks: Task[]; failed: { ref: string; message: string }[] }

async function resolveAll(refs: string[]): Promise<Resolved> {
  const results = await Promise.allSettled(refs.map(resolveTask))
  const resolved: Resolved = { tasks: [], failed: [] }
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') resolved.tasks.push(result.value)
    else resolved.failed.push({ ref: refs[i], message: errorMessage(result.reason) })
  })
  return resolved
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not add the card'
}

/** Takes one or several keys or links; the ones that fail stay in the field with their errors. */
export function AddCardForm({
  onAdd,
  onDone,
}: {
  onAdd: (tasks: Task[]) => void
  onDone: () => void
}) {
  const [input, setInput] = useState('')
  const resolve = useMutation({
    mutationFn: resolveAll,
    onSuccess: ({ tasks, failed }) => {
      if (tasks.length > 0) onAdd(tasks)
      if (failed.length === 0) onDone()
      else setInput(failed.map((f) => f.ref).join(', '))
    },
  })
  const refs = [...new Set(input.split(/[\s,;]+/).filter(Boolean))]
  const tooMany = refs.length > MAX_REFS

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (refs.length > 0 && !tooMany) resolve.mutate(refs)
  }

  const errors = tooMany
    ? [`Up to ${MAX_REFS} cards at a time.`]
    : resolve.isError
      ? [errorMessage(resolve.error)]
      : (resolve.data?.failed.map((f) => `${f.ref}: ${f.message}`) ?? [])

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="card-ref" className="text-muted-foreground text-[13px]">
        Issue keys or links
      </label>
      <Input
        id="card-ref"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="DEMO-1, DEMO-2"
        className="h-8"
        autoComplete="off"
        spellCheck={false}
        autoFocus
        disabled={resolve.isPending}
      />
      {errors.length > 0 ? (
        <ul role="alert" className="text-destructive text-[13px]">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-[13px]">Separate several with commas.</p>
      )}
    </form>
  )
}

type Props = {
  tool: Tool
  onTool: (tool: Tool) => void
  onAddCards: (tasks: Task[]) => void
}

export function Toolbar({ tool, onTool, onAddCards }: Props) {
  const [open, setOpen] = useState(false)

  useShortcut('select', () => onTool('select'))
  useShortcut('hand', () => onTool('hand'))
  useShortcut('frame', () => onTool('frame'))
  useShortcut('sticky', () => onTool('sticky'))
  useShortcut('text', () => onTool('text'))
  useShortcut('card', () => setOpen(true))

  return (
    <div className="bg-card absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border p-1 shadow-md">
      {TOOLS.map(({ tool: value, Icon }) => (
        <Button
          key={value}
          variant={tool === value ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={SHORTCUTS[value].label}
          aria-pressed={tool === value}
          title={withShortcut(value)}
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
            aria-label={SHORTCUTS.card.label}
            title={withShortcut('card')}
          >
            <TicketPlus className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={10} className="w-72 p-2">
          <AddCardForm onAdd={onAddCards} onDone={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
