import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { createBoard } from '@/api/boards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewBoardForm({
  onCreated,
  onCancel,
  autoFocus,
}: {
  onCreated: (id: string) => void
  onCancel?: () => void
  autoFocus?: boolean
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: createBoard,
    onSuccess: (board) => {
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      setName('')
      onCreated(board.id)
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) create.mutate(name.trim())
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <label htmlFor="board-name" className="sr-only">
          Board name
        </label>
        <Input
          id="board-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel?.()
          }}
          placeholder="Board name"
          className="h-8"
          maxLength={100}
          autoFocus={autoFocus}
        />
        <Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>
          <Plus strokeWidth={1.75} />
          New board
        </Button>
      </div>
      {create.isError && <p className="text-destructive text-sm">{create.error.message}</p>}
    </form>
  )
}
