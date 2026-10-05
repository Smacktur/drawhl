import { Frame, Maximize2, Minimize2, StickyNote, TicketPlus, Trash2, Type } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import type { XYPosition } from '@xyflow/react'
import type { Task } from '@/api/tasks'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { AddCardForm } from '@/canvas/Toolbar'

export type MenuTarget = { kind: 'pane'; point: XYPosition } | { kind: 'selection' }
export type PlaceTool = 'frame' | 'sticky' | 'text'

type Props = {
  target: MenuTarget | null
  onPlace: (tool: PlaceTool, point: XYPosition) => void
  onAddCards: (tasks: Task[], point: XYPosition) => void
  onDelete: () => void
  /** How many selected cards are expanded and collapsed, for the collapse items. */
  cards: { expanded: number; collapsed: number }
  onCollapse: (collapsed: boolean) => void
  children: ReactNode
}

const PLACE: { tool: PlaceTool; label: string; Icon: typeof Frame }[] = [
  { tool: 'frame', label: 'Add frame', Icon: Frame },
  { tool: 'sticky', label: 'Add sticky note', Icon: StickyNote },
  { tool: 'text', label: 'Add text', Icon: Type },
]

const CANVAS_TARGETS =
  '.react-flow__pane, .react-flow__node, .react-flow__edge, .react-flow__nodesselection-rect'

/** Right-click menu: add elements at the clicked spot, or act on the selection. */
export function CanvasContextMenu({
  target,
  onPlace,
  onAddCards,
  onDelete,
  cards,
  onCollapse,
  children,
}: Props) {
  // Screen point where "Add Jira card" opens its input; the card lands there too.
  const [cardAt, setCardAt] = useState<XYPosition | null>(null)
  // The menu traps focus while open, so the chosen action runs once it has closed;
  // otherwise a new note or the card input could not take focus.
  const pending = useRef<(() => void) | null>(null)
  const later = (action: () => void) => () => {
    pending.current = action
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          asChild
          onContextMenu={(event) => {
            // Zoom controls and node toolbars set no target; a stale one would act on the old spot.
            if (!(event.target as Element).closest(CANVAS_TARGETS)) event.preventDefault()
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-48"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            pending.current?.()
            pending.current = null
          }}
        >
          {target?.kind === 'pane' && (
            <>
              <ContextMenuItem onSelect={later(() => setCardAt(target.point))}>
                <TicketPlus strokeWidth={1.75} />
                Add Jira card
              </ContextMenuItem>
              {PLACE.map(({ tool, label, Icon }) => (
                <ContextMenuItem key={tool} onSelect={later(() => onPlace(tool, target.point))}>
                  <Icon strokeWidth={1.75} />
                  {label}
                </ContextMenuItem>
              ))}
            </>
          )}
          {target?.kind === 'selection' && (
            <>
              {cards.expanded > 0 && (
                <ContextMenuItem onSelect={() => onCollapse(true)}>
                  <Minimize2 strokeWidth={1.75} />
                  {cards.expanded > 1 ? 'Collapse cards' : 'Collapse card'}
                </ContextMenuItem>
              )}
              {cards.collapsed > 0 && (
                <ContextMenuItem onSelect={() => onCollapse(false)}>
                  <Maximize2 strokeWidth={1.75} />
                  {cards.collapsed > 1 ? 'Expand cards' : 'Expand card'}
                </ContextMenuItem>
              )}
              <ContextMenuItem variant="destructive" onSelect={later(onDelete)}>
                <Trash2 strokeWidth={1.75} />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <Popover open={cardAt !== null} onOpenChange={(open) => !open && setCardAt(null)}>
        <PopoverAnchor
          className="fixed size-0"
          style={{ left: cardAt?.x ?? 0, top: cardAt?.y ?? 0 }}
        />
        <PopoverContent align="start" className="w-72 p-2">
          <AddCardForm
            onAdd={(tasks) => cardAt && onAddCards(tasks, cardAt)}
            onDone={() => setCardAt(null)}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
