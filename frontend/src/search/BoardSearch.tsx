import { useMemo } from 'react'
import type { Task } from '@/api/tasks'
import type { AppNode } from '@/canvas/types'
import { useShortcut } from '@/lib/shortcuts'
import { buildIndex, type Entry } from './index'
import { setSearchOpen, useSearchOpen } from './palette'
import { pushRecent, readRecent } from './recent'
import { SearchPalette } from './SearchPalette'

type Props = {
  boardId: string
  nodes: AppNode[]
  tasks: Record<string, Task>
  /** Moves the board to a node, selects only it and flashes it. */
  onJump: (id: string) => void
}

export function BoardSearch({ boardId, nodes, tasks, onJump }: Props) {
  const open = useSearchOpen()
  useShortcut('search', () => setSearchOpen(true))
  // Built only while the palette is open, so editing the board costs nothing extra.
  const index = useMemo(() => (open ? buildIndex(nodes, tasks) : []), [open, nodes, tasks])
  const recent = useMemo(() => (open ? readRecent(boardId) : []), [open, boardId])

  const choose = (entry: Entry) => {
    setSearchOpen(false)
    pushRecent(boardId, entry.id)
    onJump(entry.target)
  }

  return (
    <SearchPalette
      open={open}
      onOpenChange={setSearchOpen}
      index={index}
      recent={recent}
      onChoose={choose}
    />
  )
}
