import { useMutation } from '@tanstack/react-query'
import {
  AlarmClock,
  Frame,
  Hand,
  LayoutTemplate,
  MousePointer2,
  StickyNote,
  TicketPlus,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { resolveTask, searchTasks, type Task } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ModulePicker } from '@/modules/ModulePicker'
import { MODULES } from '@/modules/registry'
import { useCommands } from '@/search/commands'
import { JqlInput, keepOpenWhileSuggesting, useJqlCount } from '@/canvas/JqlInput'
import { SHORTCUTS, useShortcut, withShortcut } from '@/lib/shortcuts'

export type Tool = 'select' | 'hand' | 'frame' | 'sticky' | 'text' | 'timer'

const TOOLS: { tool: Tool; Icon: LucideIcon }[] = [
  { tool: 'select', Icon: MousePointer2 },
  { tool: 'hand', Icon: Hand },
  { tool: 'frame', Icon: Frame },
  { tool: 'sticky', Icon: StickyNote },
  { tool: 'text', Icon: Type },
  { tool: 'timer', Icon: AlarmClock },
]

// Tools that place an element; the palette offers them as "Add …".
const PLACE_COMMANDS = [
  { tool: 'sticky', title: 'Add sticky note', Icon: StickyNote },
  { tool: 'text', title: 'Add text', Icon: Type },
  { tool: 'frame', title: 'Add frame', Icon: Frame },
  { tool: 'timer', title: 'Add timer', Icon: AlarmClock },
] as const

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
  const count = useJqlCount(input, jql && !resolve.isPending)
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
      <JqlInput
        id="card-ref"
        value={input}
        onValueChange={setInput}
        placeholder="DEMO-1, DEMO-2"
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
        <p
          className={cn(
            'text-[13px]',
            count.isError ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {!jql
            ? 'Separate several with commas, or type a JQL query.'
            : count.isError
              ? errorMessage(count.error)
              : count.data !== undefined
                ? `${count.data} ${count.data === 1 ? 'task matches' : 'tasks match'}${count.data > MAX_REFS ? `, the first ${MAX_REFS} are added` : ''}.`
                : `JQL query, up to ${MAX_REFS} tasks.`}
        </p>
      )}
    </form>
  )
}

type Props = {
  tool: Tool
  onTool: (tool: Tool) => void
  onAddCards: (tasks: Task[]) => void
  onAddModule: (kind: string) => void
}

export function Toolbar({ tool, onTool, onAddCards, onAddModule }: Props) {
  const [open, setOpen] = useState(false)
  const [modulesOpen, setModulesOpen] = useState(false)

  useShortcut('select', () => onTool('select'))
  useShortcut('hand', () => onTool('hand'))
  useShortcut('frame', () => onTool('frame'))
  useShortcut('sticky', () => onTool('sticky'))
  useShortcut('text', () => onTool('text'))
  useShortcut('timer', () => onTool('timer'))
  useShortcut('card', () => setOpen(true))
  useShortcut('module', () => setModulesOpen(true))
  useCommands([
    ...PLACE_COMMANDS.map(({ tool: value, title, Icon }) => ({
      id: `tool:${value}`,
      title,
      group: 'Commands' as const,
      Icon,
      shortcut: value,
      run: () => onTool(value),
    })),
    {
      id: 'tool:card',
      title: 'Add Jira card',
      group: 'Commands',
      Icon: TicketPlus,
      shortcut: 'card',
      keywords: 'task issue key jql',
      run: () => setOpen(true),
    },
    {
      id: 'tool:module',
      title: 'Add module',
      group: 'Commands',
      Icon: LayoutTemplate,
      shortcut: 'module',
      run: () => setModulesOpen(true),
    },
    ...MODULES.map((def) => ({
      id: `module:${def.kind}`,
      title: `Add ${def.name}`,
      group: 'Commands' as const,
      Icon: def.Icon,
      keywords: 'module',
      run: () => onAddModule(def.kind),
    })),
  ])

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
        <PopoverContent
          side="top"
          sideOffset={10}
          className="w-96 p-2"
          onEscapeKeyDown={keepOpenWhileSuggesting}
        >
          <AddCardForm onAdd={onAddCards} onDone={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
      <Popover open={modulesOpen} onOpenChange={setModulesOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={modulesOpen ? 'secondary' : 'ghost'}
            size="icon"
            aria-label={SHORTCUTS.module.label}
            title={withShortcut('module')}
          >
            <LayoutTemplate className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={10} className="w-80 p-1">
          <ModulePicker
            onPick={(kind) => {
              onAddModule(kind)
              setModulesOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
