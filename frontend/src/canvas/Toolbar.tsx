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
import { resolveTask, searchTasks, type Task } from '@/api/tasks'
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
// Each key is one Jira request; a few at a time stays clear of rate limits.
const CONCURRENCY = 4

type Resolved = {
  tasks: Task[]
  failed: { ref: string; message: string }[]
  /** Set for a JQL query: how many tasks matched, including the ones past the limit. */
  total?: number
}

// Input with a JQL operator that is not just keys and links is a query; a lone typo stays a key.
const REF_RE = /^([A-Za-z][A-Za-z0-9_]+-\d+|https?:\/\/\S+)$/
const JQL_OPERATOR = /[=~<>!]|\b(in|is|was|changed)\b/i

function splitRefs(input: string) {
  return [...new Set(input.split(/[\s,;]+/).filter(Boolean))]
}

export function isJql(input: string) {
  const refs = splitRefs(input)
  return JQL_OPERATOR.test(input) && !refs.every((ref) => REF_RE.test(ref))
}

async function addFromInput(input: string): Promise<Resolved> {
  if (!isJql(input)) return resolveAll(splitRefs(input))
  const { tasks, total } = await searchTasks(input.trim(), MAX_REFS)
  return { tasks, failed: [], total }
}

async function resolveAll(refs: string[]): Promise<Resolved> {
  const results: PromiseSettledResult<Task>[] = []
  let next = 0
  const worker = async () => {
    while (next < refs.length) {
      const i = next++
      results[i] = await resolveTask(refs[i]).then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason: unknown) => ({ status: 'rejected', reason }) as const,
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, refs.length) }, worker))
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

/** Takes keys, links or a JQL query; keys that fail stay in the field with their errors. */
export function AddCardForm({
  onAdd,
  onDone,
}: {
  onAdd: (tasks: Task[]) => void
  onDone: () => void
}) {
  const [input, setInput] = useState('')
  const resolve = useMutation({
    mutationFn: addFromInput,
    onSuccess: ({ tasks, failed, total }) => {
      if (tasks.length > 0) onAdd(tasks)
      // A query that found nothing or more than fits stays open to be narrowed.
      if (total !== undefined && (tasks.length === 0 || total > tasks.length)) return
      if (failed.length === 0) onDone()
      else setInput(failed.map((f) => f.ref).join(', '))
    },
  })
  const jql = isJql(input)
  const tooMany = !jql && splitRefs(input).length > MAX_REFS

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (input.trim() && !tooMany) resolve.mutate(input)
  }

  const found = resolve.data?.total
  const errors = tooMany
    ? [`Up to ${MAX_REFS} cards at a time.`]
    : resolve.isError
      ? [errorMessage(resolve.error)]
      : found === 0
        ? ['No tasks match this query.']
        : found !== undefined && found > (resolve.data?.tasks.length ?? 0)
          ? [`Added ${resolve.data?.tasks.length} of ${found}. Narrow the query to add the rest.`]
          : (resolve.data?.failed.map((f) => `${f.ref}: ${f.message}`) ?? [])

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="card-ref" className="text-muted-foreground text-[13px]">
        Issue keys, links or JQL
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
        <p className="text-muted-foreground text-[13px]">
          {jql ? `JQL query, up to ${MAX_REFS} tasks.` : 'Separate several with commas.'}
        </p>
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
