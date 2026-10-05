import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RefreshIndicator } from '@/board/RefreshIndicator'

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-05T10:00:00Z') }))
afterEach(() => vi.useRealTimers())

test('counts seconds since the last sync', () => {
  render(
    <RefreshIndicator syncedAt={Date.now()} error={null} refreshing={false} onRefresh={vi.fn()} />,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Synced 0s ago')
  act(() => vi.advanceTimersByTime(12_000))
  expect(screen.getByRole('status')).toHaveTextContent('Synced 12s ago')
})

test('shows the error and refreshes on click', () => {
  const onRefresh = vi.fn()
  render(
    <RefreshIndicator
      syncedAt={Date.now() - 90_000}
      error={new Error('Jira returned 401. Check your token in Settings.')}
      refreshing={false}
      onRefresh={onRefresh}
    />,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Synced 2m ago. Jira returned 401')
  fireEvent.click(screen.getByRole('button', { name: /Refresh all/ }))
  expect(onRefresh).toHaveBeenCalledOnce()
})
