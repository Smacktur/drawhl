import { useQuery } from '@tanstack/react-query'
import { refreshBoard } from '@/api/boards'
import { getSettings } from '@/api/settings'
import { nextDelayS } from '@/board/refresh-timing'

const DEFAULT_INTERVAL_S = 30

/**
 * Polls the open board; pauses in a background tab unless `background` is set.
 * The server owns backoff per tracker.
 */
export function useRefresh(boardId: string, { background = false } = {}) {
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const intervalS = settings.data?.refresh_interval_s ?? DEFAULT_INTERVAL_S

  return useQuery({
    queryKey: ['refresh', boardId],
    queryFn: () => refreshBoard(boardId),
    refetchInterval: (query) => nextDelayS(intervalS, query.state.data?.sources ?? []) * 1000,
    // A timer waiting for a status must see the change while the user is in the tracker's tab.
    refetchIntervalInBackground: background,
    retry: false,
  })
}
