import { ViewportPortal, useReactFlow, useViewport } from '@xyflow/react'
import type { AppEdge, AppNode } from '@/canvas/types'
import { Avatar } from '@/live/Avatar'
import type { Peer } from '@/live/presence'

/**
 * Other people on the canvas: their cursors and what they have selected.
 *
 * Drawn in board coordinates and scaled back, so a cursor is the same size at any zoom.
 * Nothing here takes pointer events: a cursor passing under the mouse must not steal a click.
 */
export function PresenceLayer({ peers, nodes }: { peers: Peer[]; nodes: AppNode[] }) {
  const { zoom } = useViewport()
  const { getInternalNode } = useReactFlow<AppNode, AppEdge>()
  if (peers.length === 0) return null
  const unscale = { transform: `scale(${1 / zoom})` }
  // Read through `nodes` so outlines follow a selected node as it moves.
  const known = new Set(nodes.map((node) => node.id))
  return (
    <ViewportPortal>
      {peers.flatMap((peer) =>
        peer.selected.map((id) => {
          const node = known.has(id) ? getInternalNode(id) : undefined
          const width = node?.measured.width ?? node?.width
          const height = node?.measured.height ?? node?.height
          if (!node || !width || !height) return null
          const { x, y } = node.internals.positionAbsolute
          return (
            <div
              key={`${peer.client}:${id}`}
              className="presence-outline pointer-events-none absolute"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                width,
                height,
                borderColor: `var(--presence-${peer.user.color})`,
                zIndex: 1000,
              }}
            >
              <span className="absolute top-0 right-0 origin-top-right" style={unscale}>
                <Avatar
                  user={peer.user}
                  className="size-4 -translate-y-1/2 translate-x-1/2 text-[8px]"
                />
              </span>
            </div>
          )
        }),
      )}
      {peers.map(
        (peer) =>
          peer.cursor && (
            <div
              key={peer.client}
              className="presence-cursor pointer-events-none absolute top-0 left-0"
              style={{
                transform: `translate(${peer.cursor.x}px, ${peer.cursor.y}px)`,
                zIndex: 1001,
              }}
            >
              <div className="origin-top-left" style={unscale}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <path
                    d="M1.5 1.5 6 14.5l2.2-5.3 5.3-2.2z"
                    fill={`var(--presence-${peer.user.color})`}
                    stroke="var(--card)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="absolute top-3.5 left-3.5 flex items-center gap-1">
                  <Avatar user={peer.user} className="ring-card size-[18px] text-[8px] ring-1" />
                  <span
                    className="presence-name text-presence-foreground rounded-sm px-1 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap"
                    style={{ backgroundColor: `var(--presence-${peer.user.color})` }}
                  >
                    {peer.user.name}
                  </span>
                </div>
              </div>
            </div>
          ),
      )}
    </ViewportPortal>
  )
}
