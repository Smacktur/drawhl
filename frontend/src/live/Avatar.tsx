import { initials, type PresenceUser } from '@/live/presence'
import { cn } from '@/lib/utils'

/** A person on the board: their initials on their color. The same in the top bar and at a cursor. */
export function Avatar({
  user,
  className,
  title,
}: {
  user: PresenceUser
  className?: string
  title?: boolean
}) {
  return (
    <span
      title={title ? user.name : undefined}
      aria-label={user.name}
      style={{ backgroundColor: `var(--presence-${user.color})` }}
      className={cn(
        'text-presence-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] leading-none font-semibold select-none',
        className,
      )}
    >
      {initials(user.name)}
    </span>
  )
}

const SHOWN = 5

/** Who else has the board open, in the top bar. */
export function Faces({ people }: { people: PresenceUser[] }) {
  if (people.length === 0) return null
  const rest = people.slice(SHOWN)
  return (
    <div className="mr-1 ml-1 flex items-center" aria-label="People on this board">
      {people.slice(0, SHOWN).map((user) => (
        <Avatar key={user.id} user={user} title className="ring-card -ml-1 ring-2 first:ml-0" />
      ))}
      {rest.length > 0 && (
        <span
          title={rest.map((user) => user.name).join(', ')}
          className="bg-muted text-muted-foreground ring-card -ml-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2"
        >
          +{rest.length}
        </span>
      )}
    </div>
  )
}
