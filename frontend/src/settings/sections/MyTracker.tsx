import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  getTracker,
  removeTrackerToken,
  saveTrackerToken,
  testJira,
  type Tracker,
} from '@/api/settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/settings/sections/Section'

const HINT = {
  none: 'No token yet. Cards show only their keys until you connect one.',
  set: 'Your token is stored. Enter a new one to replace it.',
  unreadable:
    'Your stored token no longer works here: the Jira URL or the secret key changed. Enter it again.',
}

function TokenForm({ tracker }: { tracker: Tracker }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState('')
  // Cards and searches go through the person's token, so open boards read again.
  const changed = (next?: Tracker) => {
    if (next) queryClient.setQueryData(['tracker'], next)
    else void queryClient.invalidateQueries({ queryKey: ['tracker'] })
    void queryClient.invalidateQueries({ queryKey: ['settings'] })
    void queryClient.invalidateQueries({ queryKey: ['board'] })
    void queryClient.invalidateQueries({ queryKey: ['refresh'] })
  }
  const save = useMutation({
    mutationFn: () => saveTrackerToken(token.trim()),
    onSuccess: (next) => {
      setToken('')
      changed(next)
    },
  })
  const remove = useMutation({ mutationFn: removeTrackerToken, onSuccess: () => changed() })
  const test = useMutation({
    mutationFn: () => testJira(token.trim() ? { token: token.trim() } : {}),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate()
  }
  const error = save.error ?? remove.error
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tracker-url">Jira URL</Label>
        <Input id="tracker-url" value={tracker.base_url ?? ''} readOnly disabled />
        <p className="text-muted-foreground text-[13px]">Set by an admin for everyone.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tracker-token">Personal access token</Label>
        <Input
          id="tracker-token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
        />
        <p className="text-muted-foreground text-[13px]">
          {HINT[tracker.token_state]} It stays on the server and is never shown again.
        </p>
      </div>
      {error && <p className="text-destructive text-[13px]">{error.message}</p>}
      {test.isError && <p className="text-destructive text-[13px]">{test.error.message}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={save.isPending || !token.trim()}>
          Save token
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={test.isPending || (!token.trim() && tracker.token_state !== 'set')}
          onClick={() => test.mutate()}
        >
          Test connection
        </Button>
        {tracker.token_state !== 'none' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Remove token
          </Button>
        )}
        {test.isSuccess && (
          <span className="text-status-done-foreground text-[13px]">
            Connected as {test.data.user}
          </span>
        )}
      </div>
    </form>
  )
}

export function MyTracker() {
  const tracker = useQuery({ queryKey: ['tracker'], queryFn: getTracker })
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="My tracker"
        description="Your own Jira token. Cards show you only what your Jira access allows."
      />
      {tracker.isPending && <p className="text-muted-foreground">Loading…</p>}
      {tracker.isError && (
        <Alert variant="destructive">
          <AlertDescription>{tracker.error.message}</AlertDescription>
        </Alert>
      )}
      {tracker.data?.provider === 'demo' && (
        <p className="text-muted-foreground text-[13px]">
          This tiko uses demo tasks, which need no token.
        </p>
      )}
      {tracker.data?.provider === 'jira' && !tracker.data.base_url && (
        <p className="text-muted-foreground text-[13px]">
          An admin sets the Jira URL in Task source first.
        </p>
      )}
      {tracker.data?.provider === 'jira' && tracker.data.base_url && (
        <TokenForm tracker={tracker.data} />
      )}
    </div>
  )
}
