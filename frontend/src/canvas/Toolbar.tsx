import { useMutation } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { resolveTask, type Task } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Toolbar({ onAddCard }: { onAddCard: (task: Task) => void }) {
  const [ref, setRef] = useState('')
  const resolve = useMutation({
    mutationFn: resolveTask,
    onSuccess: (task) => {
      onAddCard(task)
      setRef('')
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ref.trim()) resolve.mutate(ref.trim())
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      {resolve.isError && (
        <p role="alert" className="bg-card text-destructive rounded-md border px-2 py-1 text-sm">
          {resolve.error.message}
        </p>
      )}
      <form
        onSubmit={submit}
        className="bg-card flex items-center gap-1.5 rounded-lg border p-1.5 shadow-md"
      >
        <label htmlFor="card-ref" className="sr-only">
          Issue key or link
        </label>
        <Input
          id="card-ref"
          value={ref}
          onChange={(event) => setRef(event.target.value)}
          placeholder="Issue key or link, e.g. DEMO-1"
          className="h-8 w-64"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="sm" disabled={resolve.isPending || !ref.trim()}>
          <Plus strokeWidth={1.75} />
          Add card
        </Button>
      </form>
    </div>
  )
}
