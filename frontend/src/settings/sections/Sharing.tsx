import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, saveSettings } from '@/api/settings'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toastError } from '@/lib/toast'
import { Group, SectionHeader } from '@/settings/sections/Section'

export function Sharing() {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const save = useMutation({
    mutationFn: (allowed: boolean) => saveSettings({ public_links: allowed }),
    onSuccess: (saved) => queryClient.setQueryData(['settings'], saved),
    onError: toastError,
  })
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Sharing" description="How boards can be shown outside this tiko." />
      <Group title="Public links">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="public-links">Board owners can make a public link</Label>
          <Switch
            id="public-links"
            checked={settings.data?.public_links ?? false}
            disabled={!settings.data || save.isPending}
            onCheckedChange={(allowed) => save.mutate(allowed)}
          />
        </div>
        <p className="text-muted-foreground text-[13px]">
          Anyone with a board's link can view it without signing in. Tasks from your tracker show
          only their key. Switching this off stops every public link at once.
        </p>
      </Group>
    </div>
  )
}
