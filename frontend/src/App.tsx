import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { listBoards } from '@/api/boards'
import { NewBoardForm } from '@/board/NewBoardForm'
import { TopBar } from '@/board/TopBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      {current && (
        <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
          <Canvas key={current.id} boardId={current.id} />
        </Suspense>
      )}
      {boards.data && <TopBar boards={boards.data} current={current} onSelect={setBoardId} />}
    </main>
  )
}
