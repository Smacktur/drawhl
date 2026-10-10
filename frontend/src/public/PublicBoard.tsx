import { useQuery } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import { Moon, Search, Sun, Timer } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import type { Board } from '@/api/boards'
import { ApiError } from '@/api/client'
import { getPublicBoard, getPublicVersion } from '@/api/public'
import { BoardCanvas } from '@/canvas/Canvas'
import { Emblem } from '@/components/Emblem'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FocusCapsule } from '@/focus/FocusCapsule'
import { setFocusVisible, useFocusVisible } from '@/focus/store'
import { useTheme } from '@/lib/theme'
import { setSearchOpen } from '@/search/palette'

// How soon a guest sees a change, or that the link was turned off.
const VERSION_POLL_MS = 5000
const noop = () => {}

const isGone = (error: unknown) => error instanceof ApiError && error.code === 'not_found'

function PublicBar({ name }: { name: string }) {
  const { resolved, setTheme } = useTheme()
  const focusVisible = useFocusVisible()
  const dark = resolved === 'dark'
  return (
    <div className="bg-card absolute top-4 left-4 z-10 flex items-center gap-1 rounded-lg border p-1 shadow-md">
      <a
        href="https://tiko.run"
        target="_blank"
        rel="noreferrer"
        aria-label="tiko"
        className="flex size-8 items-center justify-center"
      >
        <Emblem className="size-5" />
      </a>
      <span className="max-w-64 truncate px-1 text-[14px]">{name}</span>
      <Badge variant="outline" className="text-muted-foreground mx-1">
        View only
      </Badge>
      <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setSearchOpen(true)}>
        <Search className="size-[18px]" strokeWidth={1.75} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Focus timer"
        aria-pressed={focusVisible}
        onClick={() => setFocusVisible(!focusVisible)}
      >
        <Timer className="size-[18px]" strokeWidth={1.75} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={() => setTheme(dark ? 'light' : 'dark')}
      >
        {dark ? (
          <Sun className="size-[18px]" strokeWidth={1.75} />
        ) : (
          <Moon className="size-[18px]" strokeWidth={1.75} />
        )}
      </Button>
      <Button variant="ghost" size="sm" className="text-[14px] font-normal" asChild>
        <a href="/">Sign in</a>
      </Button>
    </div>
  )
}

/** A board opened by its public link: anyone can look, nobody can change it. */
export default function PublicBoard({ token }: { token: string }) {
  const focusVisible = useFocusVisible()
  const board = useQuery({
    queryKey: ['public', token],
    queryFn: () => getPublicBoard(token),
    staleTime: Infinity,
    retry: false,
  })
  const version = useQuery({
    queryKey: ['public-version', token],
    queryFn: () => getPublicVersion(token),
    refetchInterval: VERSION_POLL_MS,
    // A failed reload keeps the last board on screen, and the checks go on.
    enabled: board.data !== undefined,
    retry: false,
  })
  const { refetch } = board
  const seen = version.data
  // A rename changes the time and not the version.
  const stale =
    seen !== undefined &&
    (seen.version !== board.data?.version || seen.updated_at !== board.data?.updated_at)
  const checkedAt = version.dataUpdatedAt
  useEffect(() => {
    // Runs again on every check while the board is behind, so a reload that failed is retried.
    if (stale) void refetch()
  }, [stale, checkedAt, refetch])

  const data = board.data
  const shown = useMemo<Board | null>(
    () =>
      data
        ? { ...data, id: `public:${token}`, my_role: 'viewer', owner: null, public: true }
        : null,
    [data, token],
  )
  const guest = useMemo(
    () => ({ token, intervalS: data?.refresh_interval_s ?? 30 }),
    [token, data?.refresh_interval_s],
  )

  if (isGone(board.error) || isGone(version.error)) {
    return (
      <div className="absolute top-1/2 left-1/2 flex w-96 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center">
        <Emblem className="size-8" />
        <p className="text-[14px]">This board is not available.</p>
        <p className="text-muted-foreground text-[13px]">
          The link was turned off, or the board was deleted.
        </p>
      </div>
    )
  }
  if (board.isError && !shown) {
    return (
      <Alert variant="destructive" className="absolute top-20 left-1/2 w-96 -translate-x-1/2">
        <AlertDescription>{board.error.message}</AlertDescription>
      </Alert>
    )
  }
  if (!shown) return <Skeleton className="absolute inset-0 rounded-none" />
  return (
    <>
      <ReactFlowProvider>
        <BoardCanvas board={shown} viewer onAccessChanged={noop} guest={guest} />
      </ReactFlowProvider>
      <PublicBar name={shown.name} />
      {focusVisible && <FocusCapsule />}
    </>
  )
}
