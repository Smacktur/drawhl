import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { SyncSource } from '@/api/boards'
import { RefreshIndicator } from '@/board/RefreshIndicator'

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-05T10:00:00Z') }))
afterEach(() => vi.useRealTimers())

const jira: SyncSource = {
  id: 'jira',
  name: 'Jira Data Center',
  state: 'ok',
  synced_at: '2026-10-05T10:00:00Z',
  error: null,
}

function renderIndicator(props: Partial<Parameters<typeof RefreshIndicator>[0]> = {}) {
  const onRefresh = vi.fn()
  render(
    <RefreshIndicator
      sources={[jira]}
      serverError={null}
      syncedAt={Date.now()}
      refreshing={false}
      onRefresh={onRefresh}
      {...props}
    />,
  )
  return onRefresh
}

test('counts seconds since the last sync', () => {
  renderIndicator()
  expect(screen.getByRole('status')).toHaveTextContent('All trackers in sync. Synced 0s ago')
  act(() => vi.advanceTimersByTime(12_000))
  expect(screen.getByRole('status')).toHaveTextContent('Synced 12s ago')
})

test('keeps errors out of the bar and lists them per tracker on click', () => {
  const linear: SyncSource = {
    id: 'linear',
    name: 'Linear',
    state: 'error',
    synced_at: null,
    error: { code: 'unavailable', message: 'Linear returned 503', retry_after: 60 },
  }
  const onRefresh = renderIndicator({ sources: [jira, linear], syncedAt: Date.now() - 90_000 })
  expect(screen.getByRole('status')).toHaveTextContent(
    'Some trackers are not syncing. Synced 2m ago',
  )
  expect(screen.queryByText(/503/)).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Sync status' }))
  expect(screen.getByText('Jira Data Center')).toBeInTheDocument()
  expect(screen.getByText('Linear returned 503. Next try in 60s.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Refresh all/ }))
  expect(onRefresh).toHaveBeenCalledOnce()
})

test('a silent drawhl server is shown as down', () => {
  renderIndicator({ sources: [], serverError: new Error('Failed to fetch') })
  expect(screen.getByRole('status')).toHaveTextContent('Not syncing.')
  fireEvent.click(screen.getByRole('button', { name: 'Sync status' }))
  expect(screen.getByText('drawhl server')).toBeInTheDocument()
})
