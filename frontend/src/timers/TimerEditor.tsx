import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TimerData } from '@/canvas/types'
import { notifyPermission } from '@/focus/alerts'
import { cn } from '@/lib/utils'
import { useNow } from './clock'
import { formatDue, formatLeftLong, parseWhen, PRESETS, WHEN_HINT } from './time'
import { finish, goesOffAt, setDue, snooze, SNOOZES, timerState } from './timer'

type Props = {
  data: TimerData
  /** The element the timer is attached to, as the timer names it. */
  holder?: string
  onChange: (data: TimerData) => void
  onDelete: () => void
}

/** Popover content of a timer: what it waits for and when it goes off. */
export function TimerEditor({ data, holder, onChange, onDelete }: Props) {
  const now = useNow()
  const id = useId()
  const [input, setInput] = useState('')
  const state = timerState(data, now)
  const at = goesOffAt(data)
  const typed = parseWhen(input, now)
  const blocked = ['denied', 'unsupported'].includes(notifyPermission())

  const apply = (text: string) => {
    const when = parseWhen(text, now)
    if (!when || 'error' in when) return
    onChange(setDue(data, when.at))
    setInput('')
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    apply(input)
  }

  const line = typed
    ? 'error' in typed
      ? typed.error
      : `Goes off ${formatDue(typed.at)} · in ${formatLeftLong(typed.at - now)}. Press Enter to set.`
    : at === null
      ? 'Waiting.'
      : state === 'fired'
        ? `Went off ${formatDue(at)}.`
        : state === 'done'
          ? `Done. Was set for ${formatDue(at)}.`
          : `Goes off ${formatDue(at)} · in ${formatLeftLong(at - now)}.`

  return (
    <div className="flex flex-col gap-2.5">
      {holder && <p className="text-muted-foreground text-[12px]">Attached to {holder}</p>}
      <Textarea
        value={data.note}
        onChange={(event) => onChange({ ...data, note: event.target.value })}
        placeholder="What are you waiting for?"
        aria-label="Note"
        maxLength={500}
        rows={2}
        autoFocus
        className="min-h-0 resize-none text-[14px] md:text-[14px]"
      />
      <form onSubmit={submit} className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-muted-foreground text-[13px]">
          Goes off in or at
        </label>
        <Input
          id={id}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={WHEN_HINT}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => apply(preset.input)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </form>
      <p
        role="status"
        className={cn(
          'text-[13px]',
          typed && 'error' in typed ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {line}
      </p>
      {blocked && (
        <p className="text-muted-foreground text-[12px]">
          Notifications are off for this site, so only the board shows a timer that goes off.
        </p>
      )}
      <div className="flex items-center gap-1 border-t pt-2">
        {state === 'fired' && (
          <>
            <Button size="sm" onClick={() => onChange(finish(data))}>
              Done
            </Button>
            {SNOOZES.map(({ label, ms }) => (
              <Button
                key={label}
                size="sm"
                variant="ghost"
                onClick={() => onChange(snooze(data, ms, now))}
              >
                {label}
              </Button>
            ))}
          </>
        )}
        {(state === 'running' || state === 'soon' || state === 'watching') && (
          <Button size="sm" variant="ghost" onClick={() => onChange(finish(data))}>
            Mark done
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Delete timer"
          title="Delete timer"
          className="text-muted-foreground ml-auto"
          onClick={onDelete}
        >
          <Trash2 strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  )
}
