import { useQuery } from '@tanstack/react-query'
import { refreshBoard } from '@/api/boards'
import { getSettings } from '@/api/settings'
import { nextDelayS } from '@/board/refresh-timing'

const DEFAULT_INTERVAL_S = 30

/** Polls the open board; pauses in a background tab. The server owns backoff per tracker. */
export function useRefresh(boardId: string) {
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const intervalS = settings.data?.refresh_interval_s ?? DEFAULT_INTERVAL_S

  return useQuery({
    queryKey: ['refresh', boardId],
    queryFn: () => refreshBoard(boardId),
    refetchInterval: (query) => nextDelayS(intervalS, query.state.data?.sources ?? []) * 1000,
    retry: false,
  })
}
