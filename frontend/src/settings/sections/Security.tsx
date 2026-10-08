import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { changePassword, signOutEverywhere, type Me } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Group, SectionHeader } from '@/settings/sections/Section'

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
          At least 10 characters. Your other devices are signed out.
        </p>
      </div>
      {change.isError && <p className="text-destructive text-[13px]">{change.error.message}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={change.isPending}>
          Change password
        </Button>
        {change.isSuccess && (
          <span className="text-muted-foreground text-[13px]">Password changed.</span>
        )}
      </div>
    </form>
  )
}

export function Security({ me }: { me: Me }) {
  // A reload drops every cached board and task along with the session.
  const everywhere = useMutation({
    mutationFn: signOutEverywhere,
    onSuccess: () => window.location.reload(),
  })
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Security" description="Your password and where you are signed in." />
      <PasswordForm username={me.username} />
      <Group title="Sessions">
        <p className="text-muted-foreground text-[13px]">
          A sign-in lasts 30 days in each browser. Lost a device? Sign out of all of them, this one
          included.
        </p>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => everywhere.mutate()}
            disabled={everywhere.isPending}
          >
            Sign out everywhere
          </Button>
        </div>
        {everywhere.isError && (
          <p className="text-destructive text-[13px]">{everywhere.error.message}</p>
        )}
      </Group>
    </div>
  )
}
