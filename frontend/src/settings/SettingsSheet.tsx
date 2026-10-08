import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  changePassword,
  getAuthStatus,
  signOut,
  signOutEverywhere,
  updateMe,
  type Me,
} from '@/api/auth'
import { getSettings, saveSettings, testJira, type Settings } from '@/api/settings'
import { readPasteAs, writePasteAs, type PasteAs } from '@/canvas/paste'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const TOKEN_HINT = {
  none: 'No token stored yet.',
  set: 'A token is stored. Leave the field empty to keep it.',
  unreadable: 'The stored token cannot be read with the current secret key. Enter it again.',
}

function SettingsForm({ settings }: { settings: Settings }) {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState(settings.provider)
  const [baseUrl, setBaseUrl] = useState(settings.jira.base_url ?? '')
  const [token, setToken] = useState('')
  const [intervalS, setIntervalS] = useState(String(settings.refresh_interval_s))

  const jiraInput = () => ({
    base_url: baseUrl.trim(),
    ...(token.trim() && { token: token.trim() }),
  })

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        provider,
        refresh_interval_s: Number(intervalS),
        ...(baseUrl.trim() && { jira: jiraInput() }),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      // Cards resolve through the selected provider, so re-read open boards.
      void queryClient.invalidateQueries({ queryKey: ['board'] })
      void queryClient.invalidateQueries({ queryKey: ['refresh'] })
      setToken('')
    },
  })
  const test = useMutation({ mutationFn: () => testJira(jiraInput()) })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 text-[14px]">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Task source</legend>
        <RadioGroup
          value={provider}
          onValueChange={(value) => setProvider(value as Settings['provider'])}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="demo" id="provider-demo" />
            <Label htmlFor="provider-demo">Demo tasks (DEMO-1 to DEMO-12)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="jira" id="provider-jira" />
            <Label htmlFor="provider-jira">Jira Data Center</Label>
          </div>
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="refresh-interval">Refresh every, seconds</Label>
        <Input
          id="refresh-interval"
          type="number"
          min={30}
          max={300}
          step={5}
          required
          value={intervalS}
          onChange={(event) => setIntervalS(event.target.value)}
          className="w-28"
        />
        <p className="text-muted-foreground text-[13px]">
          30 to 300. One request to Jira per open board each time.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">Jira Data Center</legend>
        {!settings.secret_key_configured && (
          <Alert>
            <AlertDescription>
              Set DRAWHL_SECRET_KEY in .env and restart drawhl to store a token.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jira-url">Base URL</Label>
          <Input
            id="jira-url"
            type="url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://jira.example.com"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jira-token">Personal access token</Label>
          <Input
            id="jira-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="off"
          />
          <p className="text-muted-foreground text-[13px]">
            {TOKEN_HINT[settings.jira.token_state]} The token stays on the server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={test.isPending || !baseUrl.trim()}
            onClick={() => test.mutate()}
          >
            Test connection
          </Button>
          {test.isSuccess && (
            <span className="text-status-done-foreground text-[13px]">
              Connected as {test.data.user}
            </span>
          )}
        </div>
        {test.isError && <p className="text-destructive text-[13px]">{test.error.message}</p>}
      </fieldset>

      {save.isError && (
        <Alert variant="destructive">
          <AlertDescription>{save.error.message}</AlertDescription>
        </Alert>
      )}
      {save.isSuccess && <p className="text-muted-foreground text-[13px]">Saved.</p>}
      <div>
        <Button type="submit" disabled={save.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  )
}

// Kept in this browser, not on the server, like the other view preferences.
function PasteSetting() {
  const [value, setValue] = useState<PasteAs>(readPasteAs)
  return (
    <fieldset className="flex flex-col gap-2 px-4 text-[14px]">
      <legend className="mb-2 font-medium">Paste text as</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => {
          setValue(next as PasteAs)
          writePasteAs(next as PasteAs)
        }}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="text" id="paste-text" />
          <Label htmlFor="paste-text">Text</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="sticky" id="paste-sticky" />
          <Label htmlFor="paste-sticky">Sticky note</Label>
        </div>
      </RadioGroup>
      <p className="text-muted-foreground text-[13px]">
        Task keys and links always become cards. Saved in this browser.
      </p>
    </fieldset>
  )
}

function AccountForm({ me }: { me: Me }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(me.name)
  const [username, setUsername] = useState(me.username)
  const save = useMutation({
    mutationFn: () => updateMe({ name: name.trim(), username: username.trim() }),
    onSuccess: (saved) => queryClient.setQueryData(['auth'], { signed_in: true, me: saved }),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate()
  }
  const changed = name.trim() !== me.name || username.trim() !== me.username
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-name">Name</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={64}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-username">Username</Label>
        <Input
          id="account-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={32}
          required
        />
      </div>
      {save.isError && <p className="text-destructive text-[13px]">{save.error.message}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={save.isPending || !changed}>
          Save account
        </Button>
        {save.isSuccess && !changed && (
          <span className="text-muted-foreground text-[13px]">Saved.</span>
        )}
      </div>
    </form>
  )
}

function PasswordForm({ username }: { username: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const change = useMutation({
    mutationFn: () => changePassword({ current, new: next }),
    onSuccess: () => {
      setCurrent('')
      setNext('')
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    change.mutate()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {/* Lets password managers file the new password under the right account. */}
      <input type="text" value={username} autoComplete="username" readOnly hidden />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-current">Current password</Label>
        <Input
          id="password-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          maxLength={1024}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-new">New password</Label>
        <Input
          id="password-new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          minLength={10}
          maxLength={1024}
          required
        />
        <p className="text-muted-foreground text-[13px]">
          At least 10 characters. Other devices are signed out.
        </p>
      </div>
      {change.isError && <p className="text-destructive text-[13px]">{change.error.message}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={change.isPending}>
          Change password
        </Button>
        {change.isSuccess && (
          <span className="text-muted-foreground text-[13px]">Password changed.</span>
        )}
      </div>
    </form>
  )
}

function MyAccount() {
  const auth = useQuery({ queryKey: ['auth'], queryFn: getAuthStatus })
  const me = auth.data?.me
  if (!me) return null
  return (
    <fieldset className="flex flex-col gap-5 px-4 text-[14px]">
      <legend className="mb-2 font-medium">My account</legend>
      <AccountForm key={me.id} me={me} />
      <PasswordForm username={me.username} />
    </fieldset>
  )
}

// A reload drops every cached board and task along with the session.
function SignOut() {
  const reload = () => window.location.reload()
  const logout = useMutation({ mutationFn: signOut, onSuccess: reload })
  const everywhere = useMutation({ mutationFn: signOutEverywhere, onSuccess: reload })
  const pending = logout.isPending || everywhere.isPending
  return (
    <div className="mt-auto flex flex-wrap gap-2 px-4 pb-4">
      <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={pending}>
        <LogOut strokeWidth={1.75} />
        Sign out
      </Button>
      <Button variant="ghost" size="sm" onClick={() => everywhere.mutate()} disabled={pending}>
        Sign out everywhere
      </Button>
    </div>
  )
}

// Without `open` it renders its own button; with it the caller opens it (e.g. from a menu).
export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open === undefined && (
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon strokeWidth={1.75} />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Your account and where cards get their task data.</SheetDescription>
        </SheetHeader>
        <MyAccount />
        {settings.isPending && <p className="text-muted-foreground px-4">Loading…</p>}
        {settings.isError && (
          <Alert variant="destructive" className="mx-4 w-auto">
            <AlertDescription>{settings.error.message}</AlertDescription>
          </Alert>
        )}
        {settings.isSuccess && <SettingsForm settings={settings.data} />}
        <PasteSetting />
        <SignOut />
      </SheetContent>
    </Sheet>
  )
}
