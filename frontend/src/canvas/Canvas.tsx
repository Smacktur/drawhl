import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type OnBeforeDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { getBoard, type Board } from '@/api/boards'
import type { Task } from '@/api/tasks'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { markFresh } from '@/canvas/editing'
import { framesFirst, releaseChildren, reparent } from '@/canvas/frames'
import { FrameNode } from '@/canvas/nodes/FrameNode'
import { JiraCardNode } from '@/canvas/nodes/JiraCardNode'
import { StickyNode } from '@/canvas/nodes/StickyNode'
import { TextNode } from '@/canvas/nodes/TextNode'
import { TasksContext } from '@/canvas/tasks-context'
import { Toolbar, type Tool } from '@/canvas/Toolbar'
import { RefreshIndicator } from '@/board/RefreshIndicator'
import { lastFetched, newest } from '@/board/refresh-timing'
import { useRefresh } from '@/board/useRefresh'
import { useBoardDoc } from '@/canvas/useBoardDoc'
import type { AppEdge, AppNode } from '@/canvas/types'
import { newId } from '@/lib/id'
import { useTheme } from '@/lib/theme'

const nodeTypes = { jira_card: JiraCardNode, frame: FrameNode, sticky: StickyNode, text: TextNode }
const defaultEdgeOptions = { markerEnd: { type: MarkerType.ArrowClosed } }

// New cards step down by about one card height so several adds in a row stay readable.
const CASCADE_X = 16
const CASCADE_Y = 96

const NEW_NODES = {
  frame: { width: 480, height: 320, data: { title: '' } },
  sticky: { width: 200, height: 200, data: { text: '', color: 'yellow' } },
  text: { width: 240, height: undefined, data: { text: '' } },
} as const

function BoardCanvas({ board, onConflict }: { board: Board; onConflict: () => void }) {
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange, setViewport, saveError } =
    useBoardDoc(board, onConflict)
  const [added, setAdded] = useState<Record<string, Task>>({})
  const [tool, setTool] = useState<Tool>('select')
  const [connecting, setConnecting] = useState(false)
  const refresh = useRefresh(board.id)
  const tasks = useMemo(
    () => newest([board.tasks, added, refresh.data?.tasks ?? {}]),
    [board.tasks, added, refresh.data],
  )
  const { screenToFlowPosition } = useReactFlow()
  const theme = useTheme().resolved
  const placing = tool === 'frame' || tool === 'sticky' || tool === 'text'

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTool('select')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        return reparent([...current, node], [node.id])
      })
    },
    [screenToFlowPosition, setNodes],
  )

  // A creation tool places its element where the user clicks, then hands back to Select.
  const place = (event: MouseEvent) => {
    if (!placing) return
    const { width, height, data } = NEW_NODES[tool]
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const node = {
      id: newId(),
      type: tool,
      position: { x: point.x - width / 2, y: point.y - (height ?? 0) / 2 },
      width,
      // Text grows with its content; initialHeight shows it before measuring, so the editor can focus.
      ...(height ? { height } : { initialHeight: 28 }),
      data: { ...data },
    } as AppNode
    if (tool !== 'frame') markFresh(node.id)
    setNodes((current) =>
      tool === 'frame' ? framesFirst([...current, node]) : reparent([...current, node], [node.id]),
    )
    setTool('select')
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) => addEdge({ ...connection, id: newId() }, current)),
    [setEdges],
  )

  // Deleting a frame keeps its children: only what the user selected goes away.
  const onBeforeDelete: OnBeforeDelete<AppNode, AppEdge> = useCallback(
    async ({ nodes: doomed, edges: doomedEdges }) => {
      const kept = doomed.filter(
        (n) => n.parentId && !n.selected && doomed.some((f) => f.id === n.parentId),
      )
      if (kept.length === 0) return true
      const keptIds = new Set(kept.map((n) => n.id))
      const removed = doomed.filter((n) => !keptIds.has(n.id))
      const removedIds = new Set(removed.map((n) => n.id))
      setNodes((current) => releaseChildren(current, removedIds))
      return {
        nodes: removed,
        edges: doomedEdges.filter(
          (e) => e.selected || removedIds.has(e.source) || removedIds.has(e.target),
        ),
      }
    },
    [setNodes],
  )

  return (
    <TasksContext.Provider value={tasks}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={() => setConnecting(true)}
        onConnectEnd={() => setConnecting(false)}
        onNodeDragStop={(_, __, dragged) =>
          setNodes((current) =>
            reparent(
              current,
              dragged.map((n) => n.id),
            ),
          )
        }
        onBeforeDelete={onBeforeDelete}
        onPaneClick={place}
        onNodeClick={(event) => place(event)}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={board.doc.viewport}
        onlyRenderVisibleElements
        colorMode={theme}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        selectionOnDrag={tool === 'select'}
        panOnDrag={tool === 'hand' ? true : [1]}
        panOnScroll
        elementsSelectable={!placing}
        className={[
          connecting && 'connecting',
          placing && 'cursor-crosshair',
          tool === 'hand' && 'cursor-grab',
        ]
          .filter(Boolean)
          .join(' ')}
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
      <Toolbar tool={tool} onTool={setTool} onAddCard={addCard} />
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
