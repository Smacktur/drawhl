import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { getSettings, saveSettings, testJira, type Settings } from '@/api/settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SectionHeader } from '@/settings/sections/Section'

const TOKEN_HINT = {
  none: 'No token stored yet.',
  set: 'A token is stored. Leave the field empty to keep it.',
  unreadable: 'The stored token cannot be read with the current secret key. Enter it again.',
}

function TaskSourceForm({ settings }: { settings: Settings }) {
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
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Source</legend>
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
        <Button type="submit" size="sm" disabled={save.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  )
}

export function TaskSource() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Task source"
        description="Where cards get their task data, for everyone on this drawhl."
      />
      {settings.isPending && <p className="text-muted-foreground">Loading…</p>}
      {settings.isError && (
        <Alert variant="destructive">
          <AlertDescription>{settings.error.message}</AlertDescription>
        </Alert>
      )}
      {settings.isSuccess && <TaskSourceForm settings={settings.data} />}
    </div>
  )
}
