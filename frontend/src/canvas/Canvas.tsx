import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo, useState } from 'react'
import { getBoard, type Board } from '@/api/boards'
import type { Task } from '@/api/tasks'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { JiraCardNode } from '@/canvas/nodes/JiraCardNode'
import { TasksContext } from '@/canvas/tasks-context'
import { Toolbar } from '@/canvas/Toolbar'
import { RefreshIndicator } from '@/board/RefreshIndicator'
import { lastFetched, newest } from '@/board/refresh-timing'
import { useRefresh } from '@/board/useRefresh'
import { useBoardDoc } from '@/canvas/useBoardDoc'
import type { AppNode } from '@/canvas/types'
import { newId } from '@/lib/id'

const nodeTypes = { jira_card: JiraCardNode }

// New cards step down by about one card height so several adds in a row stay readable.
const CASCADE_X = 16
const CASCADE_Y = 96

function BoardCanvas({ board, onConflict }: { board: Board; onConflict: () => void }) {
  const { nodes, setNodes, onNodesChange, edges, onEdgesChange, setViewport, saveError } =
    useBoardDoc(board, onConflict)
  const [added, setAdded] = useState<Record<string, Task>>({})
  const refresh = useRefresh(board.id)
  const tasks = useMemo(
    () => newest([board.tasks, added, refresh.data?.tasks ?? {}]),
    [board.tasks, added, refresh.data],
  )
  const { screenToFlowPosition } = useReactFlow()

  const addCard = useCallback(
    (task: Task) => {
      setAdded((current) => ({ ...current, [task.key]: task }))
      setNodes((current) => {
        const center = screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
        const step = current.length % 5
        const node: AppNode = {
          id: newId(),
          type: 'jira_card',
          position: { x: center.x - 128 + step * CASCADE_X, y: center.y - 200 + step * CASCADE_Y },
          data: { key: task.key, collapsed: false },
        }
        return [...current, node]
      })
    },
    [screenToFlowPosition, setNodes],
  )

  return (
    <TasksContext.Provider value={tasks}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        nodeTypes={nodeTypes}
        defaultViewport={board.doc.viewport}
        onlyRenderVisibleElements
        colorMode="system"
        minZoom={0.1}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} color="var(--grid)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      <RefreshIndicator
        syncedAt={refresh.dataUpdatedAt || lastFetched(board.tasks)}
        error={refresh.error}
        refreshing={refresh.isFetching}
        onRefresh={() => void refresh.refetch()}
      />
      {saveError && (
        <Alert variant="destructive" className="absolute top-16 right-4 z-10 w-80">
          <AlertDescription>Not saved: {saveError}</AlertDescription>
        </Alert>
      )}
      <Toolbar onAddCard={addCard} />
    </TasksContext.Provider>
  )
}

export default function Canvas({ boardId }: { boardId: string }) {
  const queryClient = useQueryClient()
  const [conflict, setConflict] = useState(false)
  const board = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId),
    staleTime: Infinity,
    gcTime: 0,
  })

  const onConflict = useCallback(() => {
    setConflict(true)
    void queryClient.invalidateQueries({ queryKey: ['board', boardId] })
  }, [queryClient, boardId])

  if (board.isPending) return <Skeleton className="absolute inset-0" />
  if (board.isError) {
    return (
      <Alert variant="destructive" className="absolute top-20 left-1/2 w-96 -translate-x-1/2">
        <AlertDescription>{board.error.message}</AlertDescription>
      </Alert>
    )
  }
  return (
    <ReactFlowProvider>
      {conflict && (
        <Alert className="absolute top-4 left-1/2 z-10 flex w-96 -translate-x-1/2 items-center justify-between gap-2">
          <AlertDescription>
            This board changed in another tab. Showing the latest version.
          </AlertDescription>
          <Button variant="ghost" size="sm" onClick={() => setConflict(false)}>
            Dismiss
          </Button>
        </Alert>
      )}
      <BoardCanvas
        key={`${board.data.id}:${board.data.version}`}
        board={board.data}
        onConflict={onConflict}
      />
    </ReactFlowProvider>
  )
}
