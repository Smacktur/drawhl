import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ListTodo,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import { getAuthStatus, type Me } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from 'cn'
import { Preferences } from '@/settings/sections/Preferences'
import { Profile } from '@/settings/sections/Profile'
import { Security } from '@/settings/sections/Security'
import { TaskSource } from '@/settings/sections/TaskSource'
import { openSettings, useSettingsSection, type Section } from '@/settings/store'

type Entry = {
  id: Section
  label: string
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>
  render: (me: Me) => ReactNode
}

const GROUPS: { title: string; admin: boolean; entries: Entry[] }[] = [
  {
    title: 'Account',
    admin: false,
    entries: [
      { id: 'profile', label: 'Profile', Icon: UserRound, render: (me) => <Profile me={me} /> },
      { id: 'security', label: 'Security', Icon: KeyRound, render: (me) => <Security me={me} /> },
      {
        id: 'preferences',
        label: 'Preferences',
        Icon: SlidersHorizontal,
        render: () => <Preferences />,
      },
    ],
  },
  {
    title: 'Instance',
    admin: true,
    entries: [
      { id: 'task-source', label: 'Task source', Icon: ListTodo, render: () => <TaskSource /> },
    ],
  },
]

const NARROW = '(max-width: 719px)'

function useNarrow() {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(NARROW)
      query.addEventListener('change', listener)
      return () => query.removeEventListener('change', listener)
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  )
}

function Nav({
  groups,
  current,
  narrow,
  onPick,
}: {
  groups: typeof GROUPS
  current: Section
  narrow: boolean
  onPick: (id: Section) => void
}) {
  return (
    <nav aria-label="Settings sections" className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <h3 className="text-muted-foreground px-2 pb-1 text-[12px] font-medium">{group.title}</h3>
          {group.entries.map(({ id, label, Icon }) => {
            const active = !narrow && id === current
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onPick(id)}
                className={cn(
                  'flex h-8 items-center gap-2 rounded-md px-2 text-left text-[14px] outline-none',
                  'hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  active && 'bg-accent font-medium',
                  narrow && 'h-11',
                )}
              >
                <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {narrow && (
                  <ChevronRight className="text-muted-foreground size-4" strokeWidth={1.75} />
                )}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function SettingsBody({ me, section }: { me: Me; section: Section }) {
  const narrow = useNarrow()
  // On a narrow screen the window shows the list first, then one section with a Back button;
  // a link to another section opens it directly.
  const [listShown, setListShown] = useState(narrow && section === 'profile')
  const groups = GROUPS.filter((group) => !group.admin || me.role === 'admin')
  const entries = groups.flatMap((group) => group.entries)
  // A section the person cannot use, such as an admin one in a shared link, opens Profile.
  const entry = entries.find((item) => item.id === section) ?? entries[0]
  const pick = (id: Section) => {
    openSettings(id)
    setListShown(false)
  }

  if (narrow && listShown) {
    return (
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <DialogTitle className="text-[16px] font-semibold">Settings</DialogTitle>
        <Nav groups={groups} current={entry.id} narrow onPick={pick} />
      </div>
    )
  }

  return (
    <>
      {!narrow && (
        <aside className="bg-muted/40 flex w-52 shrink-0 flex-col gap-4 border-r p-3">
          <DialogTitle className="px-2 pt-1 text-[16px] font-semibold">Settings</DialogTitle>
          <Nav groups={groups} current={entry.id} narrow={false} onPick={pick} />
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {narrow && (
          <div className="flex items-center gap-1 border-b px-2 py-2">
            <Button variant="ghost" size="sm" onClick={() => setListShown(true)}>
              <ChevronLeft strokeWidth={1.75} />
              Settings
            </Button>
            <DialogTitle className="sr-only">Settings</DialogTitle>
          </div>
        )}
        <div className="w-full max-w-xl p-6 text-[14px] max-sm:p-4">
          {/* Keyed so a section's unsaved fields start fresh when the person changes. */}
          <div key={`${me.id}:${entry.id}`}>{entry.render(me)}</div>
        </div>
      </div>
    </>
  )
}

/** The settings window: sections on the left, the picked one on the right; over the board. */
export function SettingsDialog() {
  const section = useSettingsSection()
  const auth = useQuery({ queryKey: ['auth'], queryFn: getAuthStatus })
  const me = auth.data?.me
  return (
    <Dialog open={section !== null && !!me} onOpenChange={(open) => !open && openSettings(null)}>
      <DialogContent
        // Focus stays on the window, so no ring lands on the first section on open.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          'flex h-[min(640px,calc(100dvh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[880px]',
          'max-[719px]:h-dvh max-[719px]:max-w-none max-[719px]:rounded-none',
        )}
      >
        <DialogDescription className="sr-only">
          Your account, preferences and the settings of this drawhl.
        </DialogDescription>
        {me && section && <SettingsBody me={me} section={section} />}
      </DialogContent>
    </Dialog>
  )
}
