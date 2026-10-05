import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function ago(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`
}

type Props = {
  syncedAt: number
  error: Error | null
  refreshing: boolean
  onRefresh: () => void
}

export function RefreshIndicator({ syncedAt, error, refreshing, onRefresh }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-card absolute top-4 right-4 z-10 flex max-w-96 items-center gap-2 rounded-lg border py-1 pr-1 pl-3 text-[13px] shadow-md">
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-full',
          error ? 'bg-destructive' : 'bg-status-done-foreground',
        )}
      />
      <span className="text-muted-foreground" role="status">
        {syncedAt ? `Synced ${ago(syncedAt, now)}` : 'Not synced yet'}
        {error && <span className="text-destructive">. {error.message}</span>}
      </span>
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
