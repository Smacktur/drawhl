import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { updateMe, type Me } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/settings/sections/Section'

export function Profile({ me }: { me: Me }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(me.name)
  const [username, setUsername] = useState(me.username)
  const save = useMutation({
    mutationFn: () => updateMe({ name: name.trim(), username: username.trim() }),
    // The rest of the answer, like the demo mark of the instance, stays as it was.
    onSuccess: (saved) => {
      queryClient.setQueryData(['auth'], (old: object | undefined) => ({
        ...old,
        signed_in: true,
        me: saved,
      }))
      toast.success('Profile saved')
    },
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate()
  }
  const changed = name.trim() !== me.name || username.trim() !== me.username
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <SectionHeader title="Profile" description="How other people see you in tiko." />
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
        <p className="text-muted-foreground text-[13px]">
          You sign in with it. Letters, digits, dot, dash and underscore.
        </p>
      </div>
      {save.isError && <p className="text-destructive text-[13px]">{save.error.message}</p>}
      <div>
        <Button type="submit" size="sm" disabled={save.isPending || !changed}>
          Save profile
        </Button>
      </div>
    </form>
  )
}
