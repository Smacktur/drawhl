import { useMutation } from '@tanstack/react-query'
import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { signIn } from '@/api/auth'
import { DemoStart } from '@/auth/DemoStart'
import { Emblem } from '@/components/Emblem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function message(error: Error) {
  if (!(error instanceof ApiError)) return error.message
  if (error.code === 'invalid_credentials') return 'Wrong username or password.'
  if (error.code === 'account_disabled') return 'This account is disabled. Ask your admin.'
  if (error.code === 'too_many_attempts')
    return `Too many wrong passwords. Try again in ${error.retryAfter ?? 60} s.`
  return error.message
}

export function SignIn({ onSignedIn, demo = false }: { onSignedIn: () => void; demo?: boolean }) {
  // A demo opens on its one button; the form is for those who already signed up.
  const [formShown, setFormShown] = useState(!demo)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const login = useMutation({ mutationFn: signIn, onSuccess: onSignedIn })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (username && password) login.mutate({ username: username.trim(), password })
  }
  if (!formShown) {
    return <DemoStart onStarted={onSignedIn} onSignIn={() => setFormShown(true)} />
  }
  return (
    <form
      onSubmit={submit}
      className="absolute top-1/2 left-1/2 flex w-80 -translate-x-1/2 -translate-y-1/2 flex-col gap-3"
    >
      <p className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.03em]">
        <Emblem className="size-6" />
        tiko
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sign-in-username">Username</Label>
        <Input
          id="sign-in-username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={64}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sign-in-password">Password</Label>
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          maxLength={1024}
        />
      </div>
      <Button type="submit" disabled={login.isPending || !username || !password}>
        <LogIn strokeWidth={1.75} />
        Sign in
      </Button>
      {login.isError && <p className="text-destructive text-sm">{message(login.error)}</p>}
    </form>
  )
}
