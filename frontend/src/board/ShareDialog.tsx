import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Copy, Globe, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  findPeople,
  listMembers,
  publicUrl,
  setPublicLink,
  shareBoard,
  shareWithEveryone,
  transferBoard,
  unshareBoard,
  type BoardSummary,
  type Member,
  type ShareRole,
} from '@/api/boards'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getSettings } from '@/api/settings'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const LABEL = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' } as const
type EveryoneChoice = ShareRole | 'none'
const EVERYONE: Record<EveryoneChoice, string> = {
  none: 'No access',
  viewer: 'Can view',
  editor: 'Can edit',
}

function Initial({ name }: { name: string }) {
  return (
    <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function RoleMenu({
  label,
  children,
  disabled,
}: {
  label: string
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="ghost" size="sm" className="text-muted-foreground -mr-2.5">
          {label}
          <ChevronDown strokeWidth={1.75} data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MemberRow({
  boardId,
  member,
  manage,
  onError,
}: {
  boardId: string
  member: Member
  manage: boolean
  onError: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['members', boardId] })
    void queryClient.invalidateQueries({ queryKey: ['boards'] })
  }
  const options = { onSuccess: refresh, onError }
  const share = useMutation({
    mutationFn: (role: ShareRole) => shareBoard(boardId, member.user.id, role),
    ...options,
  })
  const remove = useMutation({
    mutationFn: () => unshareBoard(boardId, member.user.id),
    ...options,
  })
  const transfer = useMutation({
    mutationFn: () => transferBoard(boardId, member.user.id),
    onSuccess: () => {
      refresh()
      void queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onError,
  })
  return (
    <li className="flex items-center gap-3 py-2">
      <Initial name={member.user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{member.user.name}</span>
        <span className="text-muted-foreground truncate text-[12px]">{member.user.username}</span>
      </div>
      {member.role === 'owner' || !manage ? (
        <span className="text-muted-foreground text-[13px]">{LABEL[member.role]}</span>
      ) : (
        <RoleMenu label={LABEL[member.role]}>
          <DropdownMenuRadioGroup
            value={member.role}
            onValueChange={(role) => share.mutate(role as ShareRole)}
          >
            <DropdownMenuRadioItem value="editor">Can edit</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="viewer">Can view</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => transfer.mutate()}>Make owner</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate()}>
            Remove access
          </DropdownMenuItem>
        </RoleMenu>
      )}
    </li>
  )
}

function AddPeople({
  boardId,
  members,
  onError,
}: {
  boardId: string
  members: Member[]
  onError: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<ShareRole>('editor')
  const term = query.trim()
  const found = useQuery({
    queryKey: ['directory', term],
    // Keeps the last matches on screen while the next letter's search runs, so nothing flickers.
    placeholderData: keepPreviousData,
    queryFn: () => findPeople(term),
    enabled: term.length > 0,
  })
  const share = useMutation({
    mutationFn: (userId: string) => shareBoard(boardId, userId, role),
    onSuccess: () => {
      setQuery('')
      void queryClient.invalidateQueries({ queryKey: ['members', boardId] })
    },
    onError,
  })
  const inside = new Set(members.map((member) => member.user.id))
  const matches = (found.data?.people ?? []).filter((person) => !inside.has(person.id))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add people by name or username"
          aria-label="Add people"
          autoComplete="off"
          spellCheck={false}
        />
        <RoleMenu label={LABEL[role]}>
          <DropdownMenuRadioGroup value={role} onValueChange={(next) => setRole(next as ShareRole)}>
            <DropdownMenuRadioItem value="editor">Can edit</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="viewer">Can view</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </RoleMenu>
      </div>
      {term && found.isSuccess && (
        <ul className="rounded-md border p-1" aria-label="Matching people">
          {matches.length === 0 && (
            <li className="text-muted-foreground px-2 py-1.5 text-[13px]">No one to add</li>
          )}
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => share.mutate(person.id)}
                className="hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none"
              >
                <span className="font-medium">{person.name}</span>
                <span className="text-muted-foreground text-[12px]">{person.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const COPIED_MS = 2000

function PublicLink({
  boardId,
  manage,
  isPublic,
  token,
  onError,
}: {
  boardId: string
  manage: boolean
  isPublic: boolean
  token: string | null
  onError: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const allowed = useQuery({ queryKey: ['settings'], queryFn: getSettings }).data?.public_links
  const [copied, setCopied] = useState(false)
  const toggle = useMutation({
    mutationFn: (next: boolean) => setPublicLink(boardId, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', boardId] })
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
    onError,
  })
  const url = token ? publicUrl(token) : ''
  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_MS)
    }, onError)
  }
  return (
    <section className="flex flex-col gap-2 border-t pt-3" aria-label="Public link">
      <div className="flex items-center gap-3">
        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
          <Globe className="text-muted-foreground size-4" strokeWidth={1.75} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">Anyone with the link can view</span>
          <span className="text-muted-foreground text-[12px]">
            {allowed === false
              ? 'An admin switched public links off on this tiko.'
              : 'No sign-in. Tasks from your tracker show only their key.'}
          </span>
        </div>
        {manage ? (
          <Switch
            aria-label="Public link"
            checked={isPublic}
            // Turning a link off stays possible while new ones are forbidden.
            disabled={toggle.isPending || (allowed === false && !isPublic)}
            onCheckedChange={(next) => toggle.mutate(next)}
          />
        ) : (
          <span className="text-muted-foreground text-[13px]">{isPublic ? 'On' : 'Off'}</span>
        )}
      </div>
      {manage && token && (
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url}
            aria-label="Public link address"
            className="font-mono text-[12px]"
            onFocus={(event) => event.target.select()}
          />
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check strokeWidth={1.75} /> : <Copy strokeWidth={1.75} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
    </section>
  )
}

/** Who has access to a board; its owner (or an admin) changes it here. */
export function ShareDialog({
  board,
  open,
  onOpenChange,
}: {
  board: BoardSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const manage = board.my_role === 'owner'
  const [error, setError] = useState<string | null>(null)
  const onError = (failed: Error) => setError(failed.message)
  const members = useQuery({
    queryKey: ['members', board.id],
    queryFn: () => listMembers(board.id),
    enabled: open,
  })
  const everyone = useMutation({
    mutationFn: (choice: EveryoneChoice) =>
      shareWithEveryone(board.id, choice === 'none' ? null : choice),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['members', board.id] }),
    onError,
  })
  const everyoneRole: EveryoneChoice = members.data?.everyone_role ?? 'none'
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(null)
        onOpenChange(next)
      }}
    >
      {/* Pinned from the top like the search palette: the match list grows down, the window stays. */}
      <DialogContent className="top-[18%] translate-y-0 gap-4 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Share {board.name}</DialogTitle>
          <DialogDescription>
            {manage
              ? 'People you add find the board in their list.'
              : 'Only the owner can change who has access.'}
          </DialogDescription>
        </DialogHeader>
        {manage && members.data && (
          <AddPeople boardId={board.id} members={members.data.members} onError={onError} />
        )}
        {members.isError && <p className="text-destructive text-[13px]">{members.error.message}</p>}
        {members.data && (
          <ul className="-my-2 flex flex-col">
            {members.data.members.map((member) => (
              <MemberRow
                key={member.user.id}
                boardId={board.id}
                member={member}
                manage={manage}
                onError={onError}
              />
            ))}
            <li className="flex items-center gap-3 border-t py-2">
              <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                <Users className="text-muted-foreground size-4" strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">Everyone in tiko</span>
                <span className="text-muted-foreground text-[12px]">
                  Anyone who can sign in to this tiko
                </span>
              </div>
              {manage ? (
                <RoleMenu label={EVERYONE[everyoneRole]}>
                  <DropdownMenuRadioGroup
                    value={everyoneRole}
                    onValueChange={(choice) => everyone.mutate(choice as EveryoneChoice)}
                  >
                    {(Object.keys(EVERYONE) as EveryoneChoice[]).map((choice) => (
                      <DropdownMenuRadioItem key={choice} value={choice}>
                        {EVERYONE[choice]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </RoleMenu>
              ) : (
                <span className="text-muted-foreground text-[13px]">{EVERYONE[everyoneRole]}</span>
              )}
            </li>
          </ul>
        )}
        {members.data && (
          <PublicLink
            boardId={board.id}
            manage={manage}
            isPublic={members.data.public}
            token={members.data.public_token}
            onError={onError}
          />
        )}
        {error && <p className="text-destructive text-[13px]">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
