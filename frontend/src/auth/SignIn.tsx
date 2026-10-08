import { useMutation } from '@tanstack/react-query'
import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { signIn } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function message(error: Error) {
  if (!(error instanceof ApiError)) return error.message
  if (error.code === 'invalid_password') return 'Wrong password. Try again.'
  if (error.code === 'too_many_attempts')
    return `Too many wrong passwords. Try again in ${error.retryAfter ?? 60} s.`
  return error.message
}

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState('')
  const login = useMutation({ mutationFn: signIn, onSuccess: onSignedIn })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (password) login.mutate(password)
  }
  return (
    <form
      onSubmit={submit}
      className="absolute top-1/2 left-1/2 flex w-80 -translate-x-1/2 -translate-y-1/2 flex-col gap-3"
    >
      <p className="text-[18px] font-semibold">drawhl</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instance-password">Password</Label>
        <Input
          id="instance-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          maxLength={1024}
          autoFocus
        />
      </div>
      <Button type="submit" disabled={login.isPending || !password}>
        <LogIn strokeWidth={1.75} />
        Sign in
      </Button>
      {login.isError && <p className="text-destructive text-sm">{message(login.error)}</p>}
      <p className="text-muted-foreground text-[13px]">
        The password is in <code className="font-mono text-[12px]">DRAWHL_PASSWORD</code> or, if
        that is empty, in the server log and{' '}
        <code className="font-mono text-[12px]">data/password</code>.
      </p>
    </form>
  )
}
