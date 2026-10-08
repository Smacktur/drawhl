import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps, type FormEvent } from 'react'
import { acceptInvite, openInvite, type InviteInfo } from '@/api/people'
import { Emblem } from '@/components/Emblem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type InviteLink = { kind: 'invite' | 'reset'; token: string }

/** `?invite=<token>` or `?reset=<token>` from the address, if the page was opened by a link. */
export function readInviteLink(): InviteLink | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const invite = params.get('invite')
  if (invite) return { kind: 'invite', token: invite }
  const reset = params.get('reset')
  return reset ? { kind: 'reset', token: reset } : null
}

// A full load drops whatever session and cache the browser had before the link.
function leave() {
  const url = new URL(window.location.href)
  url.searchParams.delete('invite')
  url.searchParams.delete('reset')
  window.location.replace(url)
}

function Field({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
      {hint && <p className="text-muted-foreground text-[13px]">{hint}</p>}
    </div>
  )
}

function AcceptForm({ token, info }: { token: string; info: InviteInfo }) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const isInvite = info.kind === 'invite'
  const accept = useMutation({
    mutationFn: () =>
      acceptInvite(
        token,
        isInvite ? { username: username.trim(), name: name.trim(), password } : { password },
      ),
    onSuccess: leave,
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    accept.mutate()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-muted-foreground text-[14px]">
        {isInvite
          ? `You are invited to drawhl${info.role === 'admin' ? ' as an admin' : ''}. Pick how you sign in.`
          : `Set a new password for ${info.username}.`}
      </p>
      {isInvite && (
        <>
          <Field
            id="invite-name"
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={64}
            required
            autoFocus
          />
          <Field
            id="invite-username"
            label="Username"
            hint="Letters, digits, dot, dash and underscore."
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={32}
            required
          />
        </>
      )}
      {!isInvite && (
        <input type="text" value={info.username ?? ''} autoComplete="username" readOnly hidden />
      )}
      <Field
        id="invite-password"
        label={isInvite ? 'Password' : 'New password'}
        hint="At least 10 characters."
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        minLength={10}
        maxLength={1024}
        required
        autoFocus={!isInvite}
      />
      <Button type="submit" disabled={accept.isPending}>
        {isInvite ? 'Join drawhl' : 'Set password'}
      </Button>
      {accept.isError && <p className="text-destructive text-sm">{accept.error.message}</p>}
    </form>
  )
}

/** The page an invite or password reset link opens, before or instead of signing in. */
export function AcceptInvite({ link }: { link: InviteLink }) {
  const info = useQuery({
    queryKey: ['invite', link.token],
    queryFn: () => openInvite(link.token),
    retry: false,
  })
  return (
    <div className="absolute top-1/2 left-1/2 flex w-80 -translate-x-1/2 -translate-y-1/2 flex-col gap-4">
      <p className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.03em]">
        <Emblem className="size-6" />
        drawhl
      </p>
      {info.isPending && <p className="text-muted-foreground text-[14px]">Checking the link…</p>}
      {info.isError && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px]">{info.error.message}</p>
          <div>
            <Button variant="outline" size="sm" onClick={leave}>
              Go to sign in
            </Button>
          </div>
        </div>
      )}
      {info.isSuccess && <AcceptForm token={link.token} info={info.data} />}
    </div>
  )
}
