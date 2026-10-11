import { CircleHelp } from 'lucide-react'
import { useContext } from 'react'
import { Emblem } from '@/components/Emblem'
import { cn } from '@/lib/utils'
import { BoardSourcesContext } from '@/sources/board-sources'
import { isKnownSource, sourceMark, sourceName } from '@/sources/registry'

/** The small logo of the tracker a task comes from. */
export function SourceMark({ source, className }: { source: string; className?: string }) {
  const size = cn('inline-block size-3.5 shrink-0', className)
  const mark = sourceMark(source)
  if (mark?.mark) {
    const name = sourceName(source)
    if (!mark.markDark) return <img src={mark.mark} alt={name} title={name} className={size} />
    // Two files, never one recolored: the tracker's own mark for each theme.
    return (
      <>
        <img src={mark.mark} alt={name} title={name} className={cn(size, 'dark:hidden')} />
        <img
          src={mark.markDark}
          alt={name}
          title={name}
          className={cn(size, 'hidden dark:inline-block')}
        />
      </>
    )
  }
  if (isKnownSource(source)) {
    return (
      <span role="img" aria-label="Demo task" title="Demo task" className={size}>
        <Emblem className="size-full" />
      </span>
    )
  }
  return (
    <CircleHelp
      aria-label="Unknown tracker"
      className={cn(size, 'text-muted-foreground')}
      strokeWidth={1.75}
    />
  )
}

/** The mark for a task on the board, or nothing while the board has one tracker. */
export function BoardSourceMark({ source, className }: { source?: string; className?: string }) {
  const { mixed, defaultSource } = useContext(BoardSourcesContext)
  if (!mixed) return null
  return <SourceMark source={source || defaultSource} className={className} />
}
