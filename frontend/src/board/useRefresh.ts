import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { refreshBoard } from '@/api/boards'
import { getSettings } from '@/api/settings'
import { nextDelayS, userMustAct } from '@/board/refresh-timing'

const DEFAULT_INTERVAL_S = 30

/** Polls the open board; pauses in a background tab, slows down while Jira fails. */
export function useRefresh(boardId: string) {
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const intervalS = settings.data?.refresh_interval_s ?? DEFAULT_INTERVAL_S
  const failures = useRef(0)

  return useQuery({
    queryKey: ['refresh', boardId],
    queryFn: async () => {
      try {
        const result = await refreshBoard(boardId)
        failures.current = 0
        return result
      } catch (error) {
        if (!userMustAct(error)) failures.current += 1
        throw error
      }
    },
    refetchInterval: (query) => nextDelayS(intervalS, failures.current, query.state.error) * 1000,
    retry: false,
  })
}
