import { cn } from '@/lib/utils'

const DOTS = [
  [5, 5],
  [16, 5],
  [27, 5],
  [5, 16],
  [5, 27],
  [16, 27],
  [27, 27],
]

/** The drawhl emblem in theme colors; geometry matches brand/emblem. */
export function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('shrink-0', className)}>
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} className="fill-muted-foreground/60" />
      ))}
      <rect x={10.6} y={10.8} width={18.8} height={10.4} rx={2.6} className="fill-primary" />
    </svg>
  )
}
