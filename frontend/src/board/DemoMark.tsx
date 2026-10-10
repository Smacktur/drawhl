import { Badge } from '@/components/ui/badge'

const DAY_MS = 24 * 3600 * 1000

/** How long a demo visitor's boards are still kept, in whole days. */
export function demoDaysLeft(expiresAt: string, now = Date.now()): string {
  const days = Math.max(1, Math.ceil((Date.parse(expiresAt) - now) / DAY_MS))
  return days === 1 ? '1 day' : `${days} days`
}

/** Tells a demo visitor that their boards are temporary. */
export function DemoMark({ expiresAt }: { expiresAt: string }) {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground mx-1"
      title="Each visit starts the count again."
    >
      Demo · kept for {demoDaysLeft(expiresAt)}
    </Badge>
  )
}
