import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { deleteBoard, renameBoard, type BoardSummary } from '@/api/boards'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** Inline name field in the top bar; Enter saves, Escape or leaving the field cancels. */
export function RenameBoardForm({ board, onDone }: { board: BoardSummary; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(board.name)
  const rename = useMutation({
    mutationFn: (value: string) => renameBoard(board.id, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      onDone()
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = name.trim()
    if (!value || value === board.name) return onDone()
    rename.mutate(value)
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <label htmlFor="board-rename" className="sr-only">
        Board name
      </label>
      <Input
        id="board-rename"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDone()
        }}
        className="h-8 w-56"
        maxLength={100}
        autoFocus
        onFocus={(event) => event.target.select()}
        disabled={rename.isPending}
        aria-invalid={rename.isError}
        title={rename.isError ? rename.error.message : undefined}
      />
      <Button type="submit" size="icon" variant="ghost" aria-label="Save name">
        <Check strokeWidth={1.75} />
      </Button>
    </form>
  )
}

type DeleteProps = {
  board: BoardSummary | null
  onOpenChange: (open: boolean) => void
}

export function DeleteBoardDialog({ board, onOpenChange }: DeleteProps) {
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      onOpenChange(false)
    },
  })
  return (
    <Dialog open={board !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete board?</DialogTitle>
          <DialogDescription>
            "{board?.name}" and everything on it will be deleted. Tasks stay in Jira. A copy remains
            in the latest backup, if one was made.
          </DialogDescription>
        </DialogHeader>
        {remove.isError && <p className="text-destructive text-sm">{remove.error.message}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => board && remove.mutate(board.id)}
          >
            Delete board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
