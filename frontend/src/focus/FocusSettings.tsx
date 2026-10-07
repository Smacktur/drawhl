import { Minus, Plus, RotateCcw, SkipForward } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { askNotify, notifyPermission, type NotifyPermission } from './alerts'
import { updateSettings, updateTimer, useFocus } from './store'
import { LIMITS, reset, skip, type TimerSettings } from './timer'

type Length = keyof typeof LIMITS

function Stepper({ field, label, unit }: { field: Length; label: string; unit?: string }) {
  const { settings } = useFocus()
  const value = settings[field]
  const [min, max] = LIMITS[field]
  const id = useId()
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <span id={id}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex h-7 items-center rounded-md border">
        <button
          type="button"
          aria-label={`Less ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => updateSettings({ [field]: value - 1 })}
          className="text-muted-foreground hover:bg-muted hover:text-foreground grid h-full w-6 place-items-center rounded-l-md disabled:opacity-40"
        >
          <Minus className="size-3" strokeWidth={1.75} />
        </button>
        <span className="w-14 text-center font-mono text-[12px] tabular-nums" aria-live="polite">
          {value}
          {unit && ` ${unit}`}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => updateSettings({ [field]: value + 1 })}
          className="text-muted-foreground hover:bg-muted hover:text-foreground grid h-full w-6 place-items-center rounded-r-md disabled:opacity-40"
        >
          <Plus className="size-3" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
      {hint && <p className="text-muted-foreground text-[12px]">{hint}</p>}
    </div>
  )
}

const BLOCKED: Partial<Record<NotifyPermission, string>> = {
  denied: 'Notifications are blocked for this site in the browser settings.',
  unsupported: 'This browser does not show notifications.',
}

export function FocusSettings() {
  const { settings } = useFocus()
  const [permission, setPermission] = useState(notifyPermission)
  const set = (patch: Partial<TimerSettings>) => updateSettings(patch)

  async function toggleNotify(on: boolean) {
    set({ notify: on })
    if (on) setPermission(await askNotify())
  }

  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => updateTimer((timer, s) => skip(timer, s))}
        >
          <SkipForward strokeWidth={1.75} />
          Skip phase
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => updateTimer((_, s) => reset(s))}
        >
          <RotateCcw strokeWidth={1.75} />
          Reset cycle
        </Button>
      </div>
      <div className="bg-border h-px" />
      <Stepper field="focus" label="Focus" unit="min" />
      <Stepper field="short" label="Short break" unit="min" />
      <Stepper field="long" label="Long break" unit="min" />
      <Stepper field="rounds" label="Rounds before long break" />
      <div className="bg-border h-px" />
      <Toggle
        label="Sound at the end"
        checked={settings.sound}
        onChange={(sound) => set({ sound })}
      />
      <Toggle
        label="Browser notification"
        checked={settings.notify}
        onChange={toggleNotify}
        hint={settings.notify ? BLOCKED[permission] : undefined}
      />
      <Toggle
        label="Start the next phase on its own"
        checked={settings.autoStart}
        onChange={(autoStart) => set({ autoStart })}
      />
    </div>
  )
}
