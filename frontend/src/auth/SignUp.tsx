import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { signUp } from '@/api/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** A demo visitor picks a name and a password and keeps the boards they made. */
export function SignUpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const join = useMutation({
    mutationFn: () => signUp({ name: name.trim(), username: username.trim(), password }),
    onSuccess: (me) => {
      // The same person and session: only the demo mark and its limits go.
      queryClient.setQueryData(['auth'], { signed_in: true, me, demo: true })
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      onOpenChange(false)
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    join.mutate()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Sign up to keep your boards</DialogTitle>
            <DialogDescription>
              Your boards stay as they are. Sign in with this username on any device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sign-up-name">Name</Label>
            <Input
              id="sign-up-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={64}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sign-up-username">Username</Label>
            <Input
              id="sign-up-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              minLength={3}
              maxLength={32}
              required
            />
            <p className="text-muted-foreground text-[13px]">
              Letters, digits, dot, dash and underscore.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sign-up-password">Password</Label>
            <Input
              id="sign-up-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={10}
              maxLength={1024}
              required
            />
            <p className="text-muted-foreground text-[13px]">
              At least 10 characters. There is no reset by mail: keep it somewhere safe.
            </p>
          </div>
          {join.isError && <p className="text-destructive text-sm">{join.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={join.isPending}>
              Sign up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
