import { useEdgesState, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import type { Board } from '@/api/boards'
import { AUTH_REQUIRED_EVENT } from '@/api/client'
import type { AppEdge, AppNode } from '@/canvas/types'
import { LOCAL, LiveBinding } from '@/live/binding'
import {
  colorOf,
  parsePeers,
  peopleOf,
  presenceSender,
  setBoardPeople,
  type Peer,
  type PresenceState,
} from '@/live/presence'

/** connecting: no sync yet; unavailable: none after a while; live: synced at least once. */
export type LiveStatus = 'connecting' | 'unavailable' | 'live'

// A burst of changes, like typing or a resize, is one undo step.
const UNDO_CAPTURE_MS = 300
const UNAVAILABLE_AFTER_MS = 5000
// A little longer than the transition, so it always finishes.
const GLIDE_MS = 250
const NO_GLIDE: ReadonlySet<string> = new Set()
const SESSION_ENDED = 4401
const ACCESS_CHANGED = 4403

// Until the board is connected there is nobody to tell.
const IDLE = presenceSender(() => {})

function socketUrl() {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/api/boards`
}

/**
 * Board state shared live with everyone on the board.
 *
 * The canvas shows the saved board until the first sync and cannot be edited before it, so no
 * change is ever kept only in a tab the server has not heard from.
 */
export function useLiveBoard(
  board: Board,
  readOnly: boolean,
  onAccessChanged: () => void,
  me: { id: string; name: string } | undefined,
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(board.doc.nodes as AppNode[])
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>(board.doc.edges)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const binding = useRef<LiveBinding | null>(null)
  const history = useRef<Y.UndoManager | null>(null)
  const synced = useRef(false)
  const [peers, setPeers] = useState<Peer[]>([])
  // Nodes someone else just moved or resized: drawn with a short glide.
  const [glide, setGlide] = useState(NO_GLIDE)
  const latest = useRef(nodes)
  const [presence, setPresence] = useState(IDLE)
  const [meId, meName] = [me?.id, me?.name]
  const accessChanged = useRef(onAccessChanged)
  useEffect(() => {
    accessChanged.current = onAccessChanged
  }, [onAccessChanged])

  useEffect(() => {
    const doc = new Y.Doc()
    let frame = 0
    let gliding: ReturnType<typeof setTimeout> | undefined
    const pull = () => {
      if (!synced.current || frame) return
      // Once per frame: a burst of updates redraws the canvas once.
      frame = requestAnimationFrame(() => {
        frame = 0
        const before = new Map(latest.current.map((node) => [node.id, node]))
        const moved = live.pullNodes(latest.current).filter((node) => {
          const was = before.get(node.id)
          return (
            was !== undefined &&
            was !== node &&
            (was.position.x !== node.position.x ||
              was.position.y !== node.position.y ||
              was.width !== node.width ||
              was.height !== node.height)
          )
        })
        if (moved.length) {
          setGlide(new Set(moved.map((node) => node.id)))
          clearTimeout(gliding)
          gliding = setTimeout(() => setGlide(NO_GLIDE), GLIDE_MS)
        }
        setNodes((current) => live.pullNodes(current))
        setEdges((current) => live.pullEdges(current))
      })
    }
    const live = new LiveBinding(doc, pull)
    live.canWrite = !readOnly
    binding.current = live
    history.current = new Y.UndoManager([live.nodes, live.edges], {
      trackedOrigins: new Set([LOCAL]),
      captureTimeout: UNDO_CAPTURE_MS,
    })
    // Other tabs of this browser go through the server too, so roles hold for them as well.
    const provider = new WebsocketProvider(socketUrl(), `${board.id}/live`, doc, {
      disableBc: true,
    })
    const awareness = provider.awareness
    let mine = IDLE
    if (meId !== undefined) {
      awareness.setLocalState({
        user: { id: meId, name: meName ?? '', color: colorOf(meId) },
        cursor: null,
        selected: [],
        drag: null,
      } satisfies PresenceState)
      mine = presenceSender((patch) => {
        for (const [field, value] of Object.entries(patch)) {
          awareness.setLocalStateField(field, value)
        }
      })
    }
    let shown = ''
    const onPresence = () => {
      const next = parsePeers(awareness.getStates(), doc.clientID)
      setBoardPeople(peopleOf(next, meId))
      const text = JSON.stringify(next)
      if (text !== shown) setPeers(next)
      shown = text
    }
    awareness.on('change', onPresence)
    const waiting = setTimeout(
      () => setStatus((now) => (now === 'connecting' ? 'unavailable' : now)),
      UNAVAILABLE_AFTER_MS,
    )
    provider.on('sync', (isSynced: boolean) => {
      if (!isSynced || synced.current) return
      const all = live.reset()
      synced.current = true
      setNodes(all.nodes)
      setEdges(all.edges)
      setStatus('live')
      setPresence(mine)
    })
    provider.on('closed', ({ code }) => {
      if (code === SESSION_ENDED) window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
      if (code === ACCESS_CHANGED) accessChanged.current()
    })
    return () => {
      clearTimeout(waiting)
      clearTimeout(gliding)
      cancelAnimationFrame(frame)
      mine.cancel()
      setPresence(IDLE)
      setBoardPeople([])
      setPeers([])
      synced.current = false
      binding.current = history.current = null
      provider.destroy()
      doc.destroy()
    }
  }, [board.id, readOnly, setNodes, setEdges, meId, meName])

  // A layout effect: nothing can arrive between a change on the canvas and its write.
  useLayoutEffect(() => {
    latest.current = nodes
    if (synced.current) binding.current?.push(nodes, edges)
  }, [nodes, edges, status])

  const undo = useCallback(() => void history.current?.undo(), [])
  const redo = useCallback(() => void history.current?.redo(), [])
  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    status,
    undo,
    redo,
    peers,
    glide,
    presence,
  }
}
