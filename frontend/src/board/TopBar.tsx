import {
  ChevronDown,
  Keyboard,
  Menu,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import type { BoardSummary } from '@/api/boards'
import { DeleteBoardDialog, RenameBoardForm } from '@/board/BoardActions'
import { NewBoardForm } from '@/board/NewBoardForm'
import { ShortcutsDialog } from '@/board/ShortcutsDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatShortcut, useShortcut } from '@/lib/shortcuts'
import { useTheme, type Theme } from '@/lib/theme'
import { SettingsSheet } from '@/settings/SettingsSheet'

const themes = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const

type Props = {
  boards: BoardSummary[]
  current?: BoardSummary
  onSelect: (id: string) => void
}

export function TopBar({ boards, current, onSelect }: Props) {
  const { theme, setTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState<BoardSummary | null>(null)

  useShortcut('help', () => setShortcutsOpen(true))

  return (
    <div className="bg-card absolute top-4 left-4 z-10 flex items-center gap-1 rounded-lg border p-1 shadow-md">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Main menu">
            <Menu className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings strokeWidth={1.75} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
            <Keyboard strokeWidth={1.75} />
            Keyboard shortcuts
            <DropdownMenuShortcut>{formatShortcut('help')[0]}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as Theme)}
              >
                {themes.map(({ value, label, Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    <Icon strokeWidth={1.75} />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <DeleteBoardDialog board={deleting} onOpenChange={(open) => !open && setDeleting(null)} />

      {creating ? (
        <NewBoardForm
          autoFocus
          onCreated={(id) => {
            setCreating(false)
            onSelect(id)
          }}
          onCancel={() => setCreating(false)}
        />
      ) : renaming && current ? (
        <RenameBoardForm board={current} onDone={() => setRenaming(false)} />
      ) : (
        current && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="max-w-64 text-[14px] font-normal">
                <span className="truncate">{current.name}</span>
                <ChevronDown strokeWidth={1.75} data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuRadioGroup
                value={current.id}
                onValueChange={onSelect}
                className="max-h-80 overflow-y-auto"
              >
                {boards.map((board) => (
                  <DropdownMenuRadioItem key={board.id} value={board.id}>
                    <span className="truncate">{board.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCreating(true)}>
                <Plus strokeWidth={1.75} />
                New board
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil strokeWidth={1.75} />
                Rename board
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(current)}>
                <Trash2 strokeWidth={1.75} />
                Delete board…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
    </div>
  )
}
