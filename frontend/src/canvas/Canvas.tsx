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
  type OnConnectEnd,
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
import { anchorAt, orphanAnchors, raiseAnchors } from '@/canvas/anchors'
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
import { framesFirst, releaseChildren, reparent, splitDeletion } from '@/canvas/frames'
import { Guides } from '@/canvas/Guides'
import { gridPositions } from '@/canvas/layout'
import { absorbCards } from '@/canvas/modules'
import { AnchorNode } from '@/canvas/nodes/AnchorNode'
import { FrameNode } from '@/canvas/nodes/FrameNode'
import { JiraCardNode } from '@/canvas/nodes/JiraCardNode'
import { ModuleNode } from '@/canvas/nodes/ModuleNode'
import { StickyNode } from '@/canvas/nodes/StickyNode'
import { TextNode } from '@/canvas/nodes/TextNode'
import { TasksContext } from '@/canvas/tasks-context'
import { Toolbar, type Tool } from '@/canvas/Toolbar'
import { RefreshIndicator } from '@/board/RefreshIndicator'
import { lastFetched, lastSynced, newest } from '@/board/refresh-timing'
import { useRefresh } from '@/board/useRefresh'
import { useBoardDoc } from '@/canvas/useBoardDoc'
import { useDrawRect, type ScreenRect } from '@/canvas/useDrawRect'
import { useGuides } from '@/canvas/useGuides'
import { useHistory } from '@/canvas/useHistory'
import type { AppEdge, AppNode, JiraCardNode as JiraCardNodeType, TimerData } from '@/canvas/types'
import { newId } from '@/lib/id'
import { ModuleHostContext } from '@/modules/host-context'
import { findModule } from '@/modules/registry'
import type { ModuleHost } from '@/modules/types'
import { useShortcut } from '@/lib/shortcuts'
import { askNotify, primeAudio } from '@/focus/alerts'
import { BESIDE, dropTimers, holdsTimers, TIMER_SIZE } from '@/timers/attach'
import { flyTo, useFlashingId } from '@/canvas/fly'
import { BoardSearch } from '@/search/BoardSearch'
import { useSearchHits } from '@/search/palette'
import { BoardTimers } from '@/timers/BoardTimers'
import { newTimer, waitsForStatus } from '@/timers/timer'
import { TimerNode } from '@/timers/TimerNode'
import { useTheme } from '@/lib/theme'

const nodeTypes = {
  jira_card: JiraCardNode,
  frame: FrameNode,
  sticky: StickyNode,
  text: TextNode,
  module: ModuleNode,
  anchor: AnchorNode,
  timer: TimerNode,
}
const defaultEdgeOptions = { markerEnd: { type: MarkerType.ArrowClosed } }

// New cards step down by about one card height so several adds in a row stay readable.
const CASCADE_X = 16
const CASCADE_Y = 96
// Duplicates land next to the original; a drag shorter than this places a default-size frame.
const DUPLICATE_OFFSET = 24
const MIN_DRAW = 8
// Same floor as the frame resizer, so a thin drag still makes a usable frame.
const MIN_FRAME = { width: 160, height: 120 }
// An arrow released closer than this to where it started was a click on the handle, not a drag.
const MIN_ARROW = 16

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
  const refresh = useRefresh(board.id, { background: waitsForStatus(nodes) })
  const tasks = useMemo(
    () => newest([board.tasks, added, refresh.data?.tasks ?? {}]),
    [board.tasks, added, refresh.data],
  )
  const flow = useReactFlow<AppNode, AppEdge>()
  const { screenToFlowPosition, deleteElements, getNodes, getEdges } = flow
  const theme = useTheme().resolved
  const placing = tool === 'frame' || tool === 'sticky' || tool === 'text' || tool === 'timer'
  // Last pointer position over the canvas, where pasted items land.
  const pointer = useRef<XYPosition | null>(null)
  // Screen point where the current arrow drag started.
  const connectFrom = useRef<XYPosition | null>(null)

  useShortcut('cancel', () => setTool('select'), { preventDefault: false })

  const flashId = useFlashingId()
  const hits = useSearchHits()
  const shown = useMemo(() => {
    const raised = raiseAnchors(nodes, edges)
    if (!flashId && !hits) return raised
    return {
      ...raised,
      nodes: raised.nodes.map((n) => {
        // A timer flashes its own cube; any other node the board moved to flashes its frame.
        const flash = n.id === flashId && n.type !== 'timer'
        const hit = hits?.has(n.id)
        if (!flash && !hit) return n
        return {
          ...n,
          className: [flash && 'node-flash', hit && 'search-hit'].filter(Boolean).join(' '),
        }
      }),
    }
  }, [nodes, edges, flashId, hits])
  const history = useHistory(nodes, edges, setNodes, setEdges)
  const guides = useGuides(onNodesChange)
  useShortcut('undo', history.undo)
  useShortcut('redo', history.redo)

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

  // A timer placed on an element attaches to it; on an empty spot it stays free.
  const addTimer = (at: { screen: XYPosition } | { holder: AppNode }) => {
    // Clicks are the gestures browsers need for the permission prompt and for sound.
    void askNotify()
    primeAudio()
    const id = newId()
    const base = { id, type: 'timer', width: TIMER_SIZE, height: TIMER_SIZE } as const
    const data = newTimer(Date.now())
    markFresh(id)
    if ('holder' in at) {
      const node: AppNode = { ...base, parentId: at.holder.id, position: BESIDE, data }
      return setNodes((current) => [...current, node])
    }
    const point = screenToFlowPosition(at.screen)
    const position = { x: point.x - TIMER_SIZE / 2, y: point.y - TIMER_SIZE / 2 }
    setNodes((current) =>
      reparent(dropTimers([...current, { ...base, position, data }], [id]), [id]),
    )
  }

  const updateTimer = useCallback(
    (id: string, change: (data: TimerData) => TimerData) =>
      setNodes((current) =>
        current.map((n) =>
          n.id === id && n.type === 'timer' ? { ...n, data: change(n.data) } : n,
        ),
      ),
    [setNodes],
  )
  const openTimer = useCallback((id: string) => flyTo(flow, id), [flow])

  const placeAt = (kind: PlaceTool, screen: XYPosition) => {
    if (kind === 'timer') return addTimer({ screen })
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

  // Cards dropped on a module that takes them join it; the rest may change frames.
  const dropNodes = (ids: string[]) => {
    // The store has the final drag position; this render's nodes may not yet.
    const current = getNodes()
    const result = absorbCards(current, ids)
    let kept = result?.nodes ?? current
    if (result) {
      const edgesLeft = getEdges().filter(
        (e) => !result.absorbed.has(e.source) && !result.absorbed.has(e.target),
      )
      setEdges(edgesLeft)
      const orphans = new Set(orphanAnchors(kept, edgesLeft).map((n) => n.id))
      kept = kept.filter((n) => !orphans.has(n.id))
    }
    const left = ids.filter((id) => !result?.absorbed.has(id))
    const next = reparent(dropTimers(kept, left), left)
    // The store still says dragging, and xyflow puts a dragging node into every marquee.
    setNodes(next.map((n) => (n.dragging ? { ...n, dragging: false } : n)))
  }

  const moduleHost = useMemo<ModuleHost>(
    () => ({
      addTasks: (list) =>
        setAdded((current) => ({ ...current, ...Object.fromEntries(list.map((t) => [t.key, t])) })),
      ejectCard: (key, screen) => {
        const node: AppNode = {
          id: newId(),
          type: 'jira_card',
          position: screenToFlowPosition(screen),
          data: { key, collapsed: false },
        }
        setNodes((current) => reparent([...current, node], [node.id]))
      },
      ejectNote: (text, screen) => {
        const { width, height } = NEW_NODES.sticky
        const point = screenToFlowPosition(screen)
        const node: AppNode = {
          id: newId(),
          type: 'sticky',
          position: { x: point.x - width / 2, y: point.y - height / 2 },
          width,
          height,
          data: { text, color: 'yellow' },
        }
        setNodes((current) => reparent([...current, node], [node.id]))
      },
    }),
    [screenToFlowPosition, setNodes],
  )

  const addModule = (kind: string, screen: XYPosition) => {
    const def = findModule(kind)
    if (!def) return
    const { width, height } = def.size
    const point = screenToFlowPosition(screen)
    const node: AppNode = {
      id: newId(),
      type: 'module',
      position: { x: point.x - width / 2, y: point.y - height / 2 },
      width,
      height,
      data: { kind, content: def.defaults() },
    }
    setNodes((current) => [
      ...current.map((n) => ({ ...n, selected: false })),
      { ...node, selected: true },
    ])
  }

  const drawFrame = ({ x, y, width, height }: ScreenRect) => {
    setTool('select')
    if (width < MIN_DRAW || height < MIN_DRAW) return placeAt('frame', { x, y })
    const start = screenToFlowPosition({ x, y })
    const end = screenToFlowPosition({ x: x + width, y: y + height })
    addFrame({
      id: newId(),
      type: 'frame',
      position: start,
      width: Math.max(end.x - start.x, MIN_FRAME.width),
      height: Math.max(end.y - start.y, MIN_FRAME.height),
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

  const selectNodes = (ids: string[]) => {
    const picked = new Set(ids)
    setNodes((current) => current.map((n) => ({ ...n, selected: picked.has(n.id) })))
    setEdges((current) => current.map((e) => ({ ...e, selected: false })))
  }

  const jumpTo = (id: string) => {
    selectOnly(id, 'node')
    flyTo(flow, id)
  }

  const selectedCards = nodes.filter(
    (n): n is JiraCardNodeType => n.selected === true && n.type === 'jira_card',
  )
  const collapsedCount = selectedCards.filter((n) => n.data.collapsed).length
  const cardCounts = {
    collapsed: collapsedCount,
    expanded: selectedCards.length - collapsedCount,
  }
  const setCollapsed = (collapsed: boolean) =>
    setNodes((current) =>
      current.map((n) =>
        n.selected && n.type === 'jira_card' ? { ...n, data: { ...n.data, collapsed } } : n,
      ),
    )

  const selected = nodes.filter((n) => n.selected)
  const timerHolder = selected.length === 1 && holdsTimers(selected[0]) ? selected[0] : undefined

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

  // An arrow released over empty space points there: it ends at a new anchor.
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, state) => {
      setConnecting(false)
      const start = connectFrom.current
      connectFrom.current = null
      if (state.isValid || !state.fromNode || !state.fromHandle || !state.from || !start) return
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event
      if (Math.hypot(clientX - start.x, clientY - start.y) < MIN_ARROW) return
      const { node, side } = anchorAt(
        newId(),
        state.from,
        screenToFlowPosition({ x: clientX, y: clientY }),
      )
      setNodes((current) => reparent([...current, node], [node.id]))
      setEdges((current) => [
        ...current,
        {
          id: newId(),
          source: state.fromNode.id,
          sourceHandle: state.fromHandle.id,
          target: node.id,
          targetHandle: side,
        },
      ])
    },
    [screenToFlowPosition, setNodes, setEdges],
  )

  // Deleting a frame keeps its children: only what the user selected goes away.
  // An anchor goes with the last arrow that ends at it.
  const onBeforeDelete: OnBeforeDelete<AppNode, AppEdge> = useCallback(
    async ({ nodes: doomed, edges: doomedEdges }) => {
      const split = splitDeletion(doomed, doomedEdges)
      if (split) {
        setNodes((current) => releaseChildren(current, new Set(split.nodes.map((n) => n.id))))
      }
      const plan = split ?? { nodes: doomed, edges: doomedEdges }
      const goneNodes = new Set(plan.nodes.map((n) => n.id))
      const goneEdges = new Set(plan.edges.map((e) => e.id))
      const edgesLeft = getEdges().filter(
        (e) => !goneEdges.has(e.id) && !goneNodes.has(e.source) && !goneNodes.has(e.target),
      )
      const orphans = orphanAnchors(
        getNodes().filter((n) => !goneNodes.has(n.id)),
        edgesLeft,
      )
      if (!split && orphans.length === 0) return true
      return { nodes: [...plan.nodes, ...orphans], edges: plan.edges }
    },
    [setNodes, getNodes, getEdges],
  )

  return (
    <TasksContext.Provider value={tasks}>
      <ModuleHostContext.Provider value={moduleHost}>
        <CanvasContextMenu
          target={menuTarget}
          onPlace={placeAt}
          onAddCards={addCards}
          onAddModule={addModule}
          onDelete={deleteSelection}
          cards={cardCounts}
          onCollapse={setCollapsed}
          onAddTimer={timerHolder && (() => addTimer({ holder: timerHolder }))}
        >
          <div
            className="absolute inset-0"
            onPointerMove={(event) => (pointer.current = { x: event.clientX, y: event.clientY })}
            onPointerLeave={() => (pointer.current = null)}
            onPointerDownCapture={draw.onPointerDownCapture}
          >
            <ReactFlow
              nodes={shown.nodes}
              edges={shown.edges}
              onNodesChange={guides.onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={(event) => {
                setConnecting(true)
                const { clientX, clientY } = 'touches' in event ? event.touches[0] : event
                connectFrom.current = { x: clientX, y: clientY }
              }}
              onConnectEnd={onConnectEnd}
              onNodeDragStop={(_, __, dragged) => dropNodes(dragged.map((n) => n.id))}
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
                hits && 'searching',
                placing && 'cursor-crosshair',
                tool === 'hand' && 'cursor-grab',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} color="var(--grid)" />
              <Controls showInteractive={false} position="bottom-right" />
              <Guides guides={guides.guides} />
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
      </ModuleHostContext.Provider>
      <BoardTimers nodes={nodes} tasks={tasks} onOpen={openTimer} onChange={updateTimer}>
        <RefreshIndicator
          sources={refresh.data?.sources ?? []}
          serverError={refresh.error}
          syncedAt={lastSynced(refresh.data?.sources ?? []) || lastFetched(board.tasks)}
          refreshing={refresh.isFetching}
          onRefresh={() => void refresh.refetch()}
        />
      </BoardTimers>
      <BoardSearch
        boardId={board.id}
        nodes={nodes}
        tasks={tasks}
        onJump={jumpTo}
        onSelect={selectNodes}
      />
      {saveError && (
        <Alert variant="destructive" className="absolute top-16 right-4 z-10 w-80">
          <AlertDescription>Not saved: {saveError}</AlertDescription>
        </Alert>
      )}
      <Toolbar
        tool={tool}
        onTool={setTool}
        onAddCards={addCards}
        onAddModule={(kind) => addModule(kind, viewportCenter())}
      />
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
