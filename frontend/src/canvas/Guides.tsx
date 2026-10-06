import { useStore, ViewportPortal } from '@xyflow/react'
import type { Guide } from '@/canvas/snap'

const TICK_PX = 6

/** Alignment lines and equal-gap markers drawn while a node is dragged. */
export function Guides({ guides }: { guides: Guide[] }) {
  const zoom = useStore((s) => s.transform[2])
  if (guides.length === 0) return null
  // Flow coordinates are scaled by the zoom, so strokes are divided by it to stay 1px on screen.
  const stroke = 1 / zoom
  const tick = TICK_PX / 2 / zoom
  return (
    <ViewportPortal>
      {/* Above nodes: xyflow lifts a selected node to z-index 1000. */}
      <svg
        className="text-primary pointer-events-none absolute top-0 left-0 z-[1001] overflow-visible"
        width={1}
        height={1}
        aria-hidden
      >
        {guides.map((g, i) => {
          if (g.kind === 'align') {
            return (
              <line
                key={i}
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
              />
            )
          }
          const vertical = g.x1 === g.x2
          const [dx, dy] = vertical ? [tick, 0] : [0, tick]
          return (
            <g key={i} stroke="currentColor" strokeWidth={stroke}>
              <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
              <line x1={g.x1 - dx} y1={g.y1 - dy} x2={g.x1 + dx} y2={g.y1 + dy} />
              <line x1={g.x2 - dx} y1={g.y2 - dy} x2={g.x2 + dx} y2={g.y2 + dy} />
            </g>
          )
        })}
      </svg>
    </ViewportPortal>
  )
}
