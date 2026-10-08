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

const me = { id: 'u1', username: 'admin', name: 'Admin', role: 'admin' }

function mockApi(replies: Record<string, (init?: RequestInit) => Response> = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (replies[url]) return replies[url](init)
    if (url === '/api/auth/status') return Response.json({ signed_in: true, me })
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    return Response.json({ ...settings, ...body })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsSheet />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  return fetchMock
}

function callTo(fetchMock: ReturnType<typeof mockApi>, url: string) {
  const call = fetchMock.mock.calls.find(([path, init]) => path === url && init?.method)
  return call && { method: call[1]?.method, body: JSON.parse(String(call[1]?.body)) }
}

test('saves the refresh interval', async () => {
  const fetchMock = mockApi()
  const field = await screen.findByLabelText(/Refresh every/)
  fireEvent.change(field, { target: { value: '90' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

  await waitFor(() =>
    expect(callTo(fetchMock, '/api/settings')).toEqual({
      method: 'PUT',
      body: { provider: 'demo', refresh_interval_s: 90 },
    }),
  )
})

test('renames my account', async () => {
  const fetchMock = mockApi({
    '/api/me': (init) => Response.json({ ...me, ...JSON.parse(String(init?.body)) }),
  })
  const name = await screen.findByLabelText('Name')
  expect(screen.getByRole('button', { name: 'Save account' })).toBeDisabled()
  fireEvent.change(name, { target: { value: 'Ann ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save account' }))
  expect(await screen.findByText('Saved.')).toBeInTheDocument()
  expect(callTo(fetchMock, '/api/me')).toEqual({
    method: 'PATCH',
    body: { name: 'Ann', username: 'admin' },
  })
})

test('names a wrong current password', async () => {
  mockApi({
    '/api/me/password': () =>
      Response.json(
        { error: { code: 'invalid_credentials', message: 'The current password is wrong.' } },
        { status: 401 },
      ),
  })
  fireEvent.change(await screen.findByLabelText('Current password'), {
    target: { value: 'old-password' },
  })
  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'new-password-1' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
  expect(await screen.findByText('The current password is wrong.')).toBeInTheDocument()
})
