import { useStore, type NodeProps } from '@xyflow/react'
import { createContext, useContext, type ComponentType } from 'react'
import { Avatar } from '@/live/Avatar'
import type { PresenceUser } from '@/live/presence'

/** Who else has each node selected, by node id. */
export const SelectedByContext = createContext<Map<string, PresenceUser[]>>(new Map())

const SHOWN = 3

/**
 * The outline around a node someone else has selected, with their avatars on its corner.
 *
 * It is a child of the node, not a layer over the board: the two are one element on screen, so
 * the outline moves with the node however the node is moved or animated.
 */
function PresenceRing({ users }: { users: PresenceUser[] }) {
  // Avatars keep their size at any zoom; the outline scales with the node like its own ring.
  const zoom = useStore((state) => state.transform[2])
  const rest = users.length - SHOWN
  return (
    <span
      className="presence-outline pointer-events-none absolute inset-0"
      style={{ borderColor: `var(--presence-${users[0].color})` }}
    >
      <span
        className="absolute top-0 right-0 flex origin-top-right -translate-y-1/2 translate-x-1/2 items-center"
        style={{ scale: 1 / zoom }}
      >
        {users.slice(0, SHOWN).map((user) => (
          <Avatar key={user.id} user={user} className="ring-card -ml-1 size-4 text-[8px] ring-1" />
        ))}
        {rest > 0 && (
          <span className="bg-muted text-muted-foreground ring-card -ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[8px] font-semibold ring-1">
            +{rest}
          </span>
        )}
      </span>
    </span>
  )
}

/** A node type that shows who else has it selected. */
export function withPresence<P extends NodeProps>(Node: ComponentType<P>) {
  function WithPresence(props: P) {
    const users = useContext(SelectedByContext).get(props.id)
    return (
      <>
        <Node {...props} />
        {users && <PresenceRing users={users} />}
      </>
    )
  }
  WithPresence.displayName = `WithPresence(${Node.displayName ?? Node.name})`
  return WithPresence
}
