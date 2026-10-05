import { useMutation } from '@tanstack/react-query'
import { TicketPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { resolveTask, type Task } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

export function Toolbar({ onAddCard }: { onAddCard: (task: Task) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border p-1 shadow-md">
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
