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
  type XYPosition,
  type OnBeforeDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo, useRef, useState } from 'react'
import { getBoard, type Board } from '@/api/boards'
import type { Task } from '@/api/tasks'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CanvasContextMenu, type MenuTarget, type PlaceTool } from '@/canvas/CanvasContextMenu'
import {
  cloneSnippet,
  copySelection,
  getClipboard,
  setClipboard,
  snippetOrigin,
  type Snippet,
} from '@/canvas/clipboard'
import { markFresh } from '@/canvas/editing'
import { framesFirst, releaseChildren, reparent } from '@/canvas/frames'
import { gridPositions } from '@/canvas/layout'
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
import { useDrawRect, type ScreenRect } from '@/canvas/useDrawRect'
import type { AppEdge, AppNode } from '@/canvas/types'
import { newId } from '@/lib/id'
import { useShortcut } from '@/lib/shortcuts'
import { useTheme } from '@/lib/theme'

const nodeTypes = { jira_card: JiraCardNode, frame: FrameNode, sticky: StickyNode, text: TextNode }
const defaultEdgeOptions = { markerEnd: { type: MarkerType.ArrowClosed } }

// New cards step down by about one card height so several adds in a row stay readable.
const CASCADE_X = 16
const CASCADE_Y = 96
// Duplicates land next to the original; a drag shorter than this places a default-size frame.
const DUPLICATE_OFFSET = 24
const MIN_DRAW = 8

const viewportCenter = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

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
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null)
  const refresh = useRefresh(board.id)
  const tasks = useMemo(
    () => newest([board.tasks, added, refresh.data?.tasks ?? {}]),
    [board.tasks, added, refresh.data],
  )
  const { screenToFlowPosition, deleteElements } = useReactFlow()
  const theme = useTheme().resolved
  const placing = tool === 'frame' || tool === 'sticky' || tool === 'text'
  // Last pointer position over the canvas, where pasted items land.
  const pointer = useRef<XYPosition | null>(null)

  useShortcut('cancel', () => setTool('select'), { preventDefault: false })

  // One card goes to the point or cascades from the viewport center; several form a grid there.
  const addCards = useCallback(
    (list: Task[], at?: XYPosition) => {
      setAdded((current) => ({ ...current, ...Object.fromEntries(list.map((t) => [t.key, t])) }))
      setNodes((current) => {
        const center = screenToFlowPosition(at ?? viewportCenter())
        const step = current.length % 5
        const positions =
          list.length > 1
            ? gridPositions(list.length, center)
            : [
                at
                  ? center
                  : { x: center.x - 128 + step * CASCADE_X, y: center.y - 200 + step * CASCADE_Y },
              ]
        const fresh: AppNode[] = list.map((task, i) => ({
          id: newId(),
          type: 'jira_card',
          position: positions[i],
          data: { key: task.key, collapsed: false },
        }))
        return reparent(
          [...current, ...fresh],
          fresh.map((n) => n.id),
        )
      })
    },
    [screenToFlowPosition, setNodes],
  )

  // A new frame takes in the loose elements under it, as if they had been dropped there.
  const addFrame = (frame: AppNode) =>
    setNodes((current) =>
      reparent(
        framesFirst([...current, frame]),
        current.filter((n) => n.type !== 'frame' && !n.parentId).map((n) => n.id),
      ),
    )

  const insert = (snippet: Snippet, delta: XYPosition) => {
    const copy = cloneSnippet(snippet, delta)
    setAdded((current) => ({ ...current, ...copy.tasks }))
    setNodes((current) =>
      reparent(
        framesFirst([...current.map((n) => ({ ...n, selected: false })), ...copy.nodes]),
        copy.nodes.filter((n) => !n.parentId).map((n) => n.id),
      ),
    )
    setEdges((current) => [...current.map((e) => ({ ...e, selected: false })), ...copy.edges])
  }

  // Copy and paste only take over the keys when there is something to copy or paste,
  // so copying text elsewhere on the page keeps working.
  useShortcut(
    'copy',
    (event) => {
      const snippet = copySelection(nodes, edges, tasks)
      if (!snippet) return
      event.preventDefault()
      setClipboard(snippet)
    },
    { preventDefault: false },
  )
  useShortcut(
    'paste',
    (event) => {
      const snippet = getClipboard()
      if (!snippet) return
      event.preventDefault()
      const target = screenToFlowPosition(pointer.current ?? viewportCenter())
      const origin = snippetOrigin(snippet)
      insert(snippet, { x: target.x - origin.x, y: target.y - origin.y })
    },
    { preventDefault: false },
  )
  useShortcut('duplicate', () => {
    const snippet = copySelection(nodes, edges, tasks)
    if (snippet) insert(snippet, { x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET })
  })
  useShortcut('selectAll', () => {
    setNodes((current) => current.map((n) => ({ ...n, selected: true })))
    setEdges((current) => current.map((e) => ({ ...e, selected: true })))
  })

  const placeAt = (kind: PlaceTool, screen: XYPosition) => {
    const { width, height, data } = NEW_NODES[kind]
    const point = screenToFlowPosition(screen)
    const node = {
      id: newId(),
      type: kind,
      position: { x: point.x - width / 2, y: point.y - (height ?? 0) / 2 },
      width,
      // Text grows with its content; initialHeight shows it before measuring, so the editor can focus.
      ...(height ? { height } : { initialHeight: 28 }),
      data: { ...data },
    } as AppNode
    if (kind === 'frame') return addFrame(node)
    markFresh(node.id)
    setNodes((current) => reparent([...current, node], [node.id]))
  }

  const drawFrame = ({ x, y, width, height }: ScreenRect) => {
    setTool('select')
    if (width < MIN_DRAW && height < MIN_DRAW) return placeAt('frame', { x, y })
    const start = screenToFlowPosition({ x, y })
    const end = screenToFlowPosition({ x: x + width, y: y + height })
    addFrame({
      id: newId(),
      type: 'frame',
      position: start,
      width: end.x - start.x,
      height: end.y - start.y,
      data: { title: '' },
    })
  }
  const draw = useDrawRect(tool === 'frame', drawFrame)

  // A creation tool places its element where the user clicks, then hands back to Select.
  // Frames are drawn by dragging instead.
  const place = (event: { clientX: number; clientY: number }) => {
    if (!placing || tool === 'frame') return
    placeAt(tool, { x: event.clientX, y: event.clientY })
    setTool('select')
  }

  // Right-clicking an unselected element selects just it, like tldraw.
  const selectOnly = (id: string, kind: 'node' | 'edge') => {
    setNodes((current) => current.map((n) => ({ ...n, selected: kind === 'node' && n.id === id })))
    setEdges((current) => current.map((e) => ({ ...e, selected: kind === 'edge' && e.id === id })))
  }

  const deleteSelection = () =>
    void deleteElements({
      nodes: nodes.filter((n) => n.selected),
      edges: edges.filter((e) => e.selected),
    })

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
      <CanvasContextMenu
        target={menuTarget}
        onPlace={placeAt}
        onAddCards={addCards}
        onDelete={deleteSelection}
      >
        <div
          className="absolute inset-0"
          onPointerMove={(event) => (pointer.current = { x: event.clientX, y: event.clientY })}
          onPointerLeave={() => (pointer.current = null)}
          onPointerDownCapture={draw.onPointerDownCapture}
        >
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
            onPaneContextMenu={(event) =>
              setMenuTarget({ kind: 'pane', point: { x: event.clientX, y: event.clientY } })
            }
            onNodeContextMenu={(_, node) => {
              if (!node.selected) selectOnly(node.id, 'node')
              setMenuTarget({ kind: 'selection' })
            }}
            onEdgeContextMenu={(_, edge) => {
              if (!edge.selected) selectOnly(edge.id, 'edge')
              setMenuTarget({ kind: 'selection' })
            }}
            onSelectionContextMenu={() => setMenuTarget({ kind: 'selection' })}
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
            nodesDraggable={!placing}
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
          {draw.preview && (
            <div
              className="border-primary bg-primary/5 pointer-events-none fixed rounded-sm border border-dashed"
              style={{
                left: draw.preview.x,
                top: draw.preview.y,
                width: draw.preview.width,
                height: draw.preview.height,
              }}
            />
          )}
        </div>
      </CanvasContextMenu>
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
      <Toolbar tool={tool} onTool={setTool} onAddCards={addCards} />
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
