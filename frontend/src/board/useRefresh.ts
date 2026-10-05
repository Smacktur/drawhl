import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { refreshBoard } from '@/api/boards'
import { getSettings } from '@/api/settings'

const MAX_INTERVAL_S = 300
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
        failures.current += 1
        throw error
      }
    },
    refetchInterval: () => Math.min(MAX_INTERVAL_S, intervalS * 2 ** failures.current) * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
