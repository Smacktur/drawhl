import {
  ChevronDown,
  Keyboard,
  LayoutDashboard,
  Menu,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings,
  SquareChevronRight,
  AlarmClock,
  Sun,
  SunMoon,
  Timer,
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
  DropdownMenuCheckboxItem,
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
import { setFocusVisible, useFocusVisible } from '@/focus/store'
import { useCommands } from '@/search/commands'
import { COMMANDS_PREFIX, setSearchOpen } from '@/search/palette'
import { setTimerPanelOpen } from '@/timers/panel'
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
  const focusVisible = useFocusVisible()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState<BoardSummary | null>(null)

  useShortcut('help', () => setShortcutsOpen(true))
  useCommands([
    ...(current
      ? [
          {
            id: 'app:timers',
            title: 'Show timers',
            group: 'Commands' as const,
            Icon: AlarmClock,
            keywords: 'reminders',
            run: () => setTimerPanelOpen(true),
          },
        ]
      : []),
    {
      id: 'app:focus',
      title: focusVisible ? 'Hide focus timer' : 'Show focus timer',
      group: 'Commands',
      Icon: Timer,
      keywords: 'pomodoro music lofi',
      run: () => setFocusVisible(!focusVisible),
    },
    ...themes.map(({ value, label, Icon }) => ({
      id: `app:theme:${value}`,
      title: `Switch to ${label.toLowerCase()} theme`,
      group: 'Commands' as const,
      Icon,
      keywords: 'appearance mode',
      run: () => setTheme(value),
    })),
    {
      id: 'app:shortcuts',
      title: 'Keyboard shortcuts',
      group: 'Commands',
      Icon: Keyboard,
      shortcut: 'help',
      keywords: 'hotkeys keys help',
      run: () => setShortcutsOpen(true),
    },
    {
      id: 'app:settings',
      title: 'Settings',
      group: 'Commands',
      Icon: Settings,
      keywords: 'jira token connection preferences',
      run: () => setSettingsOpen(true),
    },
    {
      id: 'app:new-board',
      title: 'New board',
      group: 'Commands',
      Icon: Plus,
      keywords: 'create add',
      run: () => setCreating(true),
    },
    ...(current
      ? [
          {
            id: 'app:rename-board',
            title: 'Rename board',
            group: 'Commands' as const,
            Icon: Pencil,
            run: () => setRenaming(true),
          },
        ]
      : []),
    ...boards
      .filter((board) => board.id !== current?.id)
      .map((board) => ({
        id: `board:${board.id}`,
        title: `Go to board ${board.name}`,
        group: 'Boards' as const,
        Icon: LayoutDashboard,
        keywords: 'open switch',
        run: () => onSelect(board.id),
      })),
  ])

  return (
    <div className="bg-card absolute top-4 left-4 z-10 flex items-center gap-1 rounded-lg border p-1 shadow-md">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Main menu">
            <Menu className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {current && (
            <DropdownMenuItem onSelect={() => setSearchOpen(true)}>
              <Search strokeWidth={1.75} />
              Search
              <DropdownMenuShortcut>{formatShortcut('search')[0]}</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
          {current && (
            <DropdownMenuItem onSelect={() => setSearchOpen(true, COMMANDS_PREFIX)}>
              <SquareChevronRight strokeWidth={1.75} />
              Commands
              <DropdownMenuShortcut>{formatShortcut('commands')[0]}</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
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
            <DropdownMenuSubTrigger>
              <SunMoon strokeWidth={1.75} />
              Theme
            </DropdownMenuSubTrigger>
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
          {current && (
            <DropdownMenuItem onSelect={() => setTimerPanelOpen(true)}>
              <AlarmClock strokeWidth={1.75} />
              Timers
            </DropdownMenuItem>
          )}
          <DropdownMenuCheckboxItem checked={focusVisible} onCheckedChange={setFocusVisible}>
            <Timer strokeWidth={1.75} />
            Focus timer
          </DropdownMenuCheckboxItem>
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
