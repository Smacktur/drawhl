import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SyncSource } from '@/api/boards'
import { syncHealth, type SyncHealth } from '@/board/refresh-timing'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SourceMark } from '@/sources/SourceMark'
import { cn } from '@/lib/utils'

function ago(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`
}

const DOT: Record<SyncHealth, string> = {
  ok: 'bg-sync-ok',
  partial: 'bg-sync-partial',
  down: 'bg-destructive',
}

const HEALTH_LABEL: Record<SyncHealth, string> = {
  ok: 'All trackers in sync',
  partial: 'Some trackers are not syncing',
  down: 'Not syncing',
}

function describe(error: NonNullable<SyncSource['error']>) {
  const message = `${error.message.replace(/\.$/, '')}.`
  return error.retry_after ? `${message} Next try in ${error.retry_after}s.` : message
}

function Dot({ health }: { health: SyncHealth }) {
  return <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', DOT[health])} />
}

function SourceRow({
  name,
  health,
  syncedAt,
  detail,
  now,
  source,
}: {
  name: string
  /** The tracker's id, for its mark; the tiko server's own row has none. */
  source?: string
  health: SyncHealth
  syncedAt: number
  detail?: string
  now: number
}) {
  return (
    <li className="flex flex-col gap-0.5 px-1 py-1.5">
      <div className="flex items-center gap-2">
        <Dot health={health} />
        {source && <SourceMark source={source} />}
        <span className="text-[13px] font-medium">{name}</span>
        <span className="text-muted-foreground ml-auto text-[12px]">
          {syncedAt ? `Synced ${ago(syncedAt, now)}` : 'Not synced yet'}
        </span>
      </div>
      {detail && <p className="text-muted-foreground pl-[18px] text-[12px]">{detail}</p>}
    </li>
  )
}

type Props = {
  sources: SyncSource[]
  /** The tiko server itself did not answer. */
  serverError: Error | null
  syncedAt: number
  refreshing: boolean
  onRefresh: () => void
}

export function RefreshIndicator({ sources, serverError, syncedAt, refreshing, onRefresh }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const health = syncHealth(sources, serverError)

  return (
    <div className="bg-card flex items-center gap-1 rounded-lg border p-1 text-[13px] shadow-md">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="font-normal" aria-label="Sync status">
            <Dot health={health} />
            <span className="text-muted-foreground" role="status">
              <span className="sr-only">{HEALTH_LABEL[health]}. </span>
              {syncedAt ? `Synced ${ago(syncedAt, now)}` : 'Not synced yet'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-80 gap-1 p-2">
          <h2 className="text-muted-foreground px-1 text-[12px] font-medium">Trackers</h2>
          <ul className="flex flex-col">
            {serverError && (
              <SourceRow
                name="tiko server"
                health="down"
                syncedAt={0}
                detail={serverError.message}
                now={now}
              />
            )}
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source.id}
                name={source.name}
                health={source.state === 'ok' ? 'ok' : 'down'}
                syncedAt={Date.parse(source.synced_at ?? '') || 0}
                detail={source.error ? describe(source.error) : undefined}
                now={now}
              />
            ))}
            {!serverError && sources.length === 0 && (
              <li className="text-muted-foreground px-1 py-1.5 text-[12px]">Checking trackers…</li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw
          strokeWidth={1.75}
          className={cn(refreshing && 'animate-spin motion-reduce:animate-none')}
        />
        Refresh all
      </Button>
    </div>
  )
}
