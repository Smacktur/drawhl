import { ChevronDown, Menu, Monitor, Moon, Plus, Settings, Sun } from 'lucide-react'
import { useState } from 'react'
import type { BoardSummary } from '@/api/boards'
import { NewBoardForm } from '@/board/NewBoardForm'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

      {creating ? (
        <NewBoardForm
          autoFocus
          onCreated={(id) => {
            setCreating(false)
            onSelect(id)
          }}
          onCancel={() => setCreating(false)}
        />
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
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
    </div>
  )
}
