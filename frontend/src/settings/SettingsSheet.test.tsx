import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { SettingsSheet } from '@/settings/SettingsSheet'

const settings = {
  provider: 'demo',
  refresh_interval_s: 30,
  secret_key_configured: true,
  jira: { base_url: null, token_state: 'none' },
}

afterEach(() => vi.unstubAllGlobals())

test('saves the refresh interval', async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    return new Response(JSON.stringify({ ...settings, ...body }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsSheet />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  const field = await screen.findByLabelText(/Refresh every/)
  fireEvent.change(field, { target: { value: '90' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  const [, init] = fetchMock.mock.calls[1]
  expect(init?.method).toBe('PUT')
  expect(JSON.parse(String(init?.body))).toEqual({ provider: 'demo', refresh_interval_s: 90 })
})
