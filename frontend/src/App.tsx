import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'
import { createBoard, listBoards } from '@/api/boards'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// xyflow needs the DOM, so the canvas is loaded only in the browser, never in prerender.
const Canvas = lazy(() => import('@/canvas/Canvas'))

const LAST_BOARD = 'drawhl.lastBoard'

// Server snapshot is false, client snapshot is true: tells prerender and hydration apart.
const subscribeNever = () => () => {}

function readBoardId(): string | null {
  return (
    new URLSearchParams(window.location.search).get('board') ?? localStorage.getItem(LAST_BOARD)
  )
}

function rememberBoard(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('board', id)
  window.history.replaceState(null, '', url)
  localStorage.setItem(LAST_BOARD, id)
}

function NewBoardForm({
  onCreated,
  autoFocus,
}: {
  onCreated: (id: string) => void
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

export default function App() {
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  const [boardId, setBoardId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : readBoardId(),
  )
  const boards = useQuery({ queryKey: ['boards'], queryFn: listBoards, enabled: mounted })

  const known = boards.data?.find((board) => board.id === boardId)
  const current = known ?? boards.data?.[0]

  useEffect(() => {
    if (current) rememberBoard(current.id)
  }, [current])

  return (
    <main className="bg-background relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">drawhl</h1>
      {(!mounted || boards.isPending) && <Skeleton className="absolute inset-0 rounded-none" />}
      {boards.isError && (
        <Alert variant="destructive" className="absolute top-20 left-1/2 w-96 -translate-x-1/2">
          <AlertDescription>{boards.error.message}</AlertDescription>
        </Alert>
      )}
      {boards.data?.length === 0 && (
        <div className="absolute top-1/2 left-1/2 flex w-96 -translate-x-1/2 -translate-y-1/2 flex-col gap-3">
          <p className="text-[14px]">Create a board to start placing Jira tasks on it.</p>
          <NewBoardForm onCreated={setBoardId} autoFocus />
        </div>
      )}
      {current && boards.data && (
        <>
          <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
            <Canvas boardId={current.id} />
          </Suspense>
          <div className="bg-card absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-lg border p-2 shadow-md">
            <label htmlFor="board-picker" className="sr-only">
              Board
            </label>
            <select
              id="board-picker"
              value={current.id}
              onChange={(event) => setBoardId(event.target.value)}
              className="border-input bg-background h-8 rounded-md border px-2 text-[14px]"
            >
              {boards.data.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
            <NewBoardForm onCreated={setBoardId} />
          </div>
        </>
      )}
    </main>
  )
}
