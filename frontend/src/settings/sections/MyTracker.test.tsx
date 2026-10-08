import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MyTracker } from '@/settings/sections/MyTracker'

afterEach(() => vi.unstubAllGlobals())

function show(tracker: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/me/tracker' && init?.method === 'PUT')
      return Response.json({ ...tracker, token_state: 'set' })
    if (url === '/api/settings/jira/test') return Response.json({ ok: true, user: 'Ann Lee' })
    return Response.json(tracker)
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MyTracker />
    </QueryClientProvider>,
  )
  return fetchMock
}

const jira = { provider: 'jira', base_url: 'https://jira.example.com', token_state: 'none' }

test('saves my own token and tests it', async () => {
  const fetchMock = show(jira)
  fireEvent.change(await screen.findByLabelText('Personal access token'), {
    target: { value: ' my-token ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save token' }))
  expect(await screen.findByText(/Your token is stored/)).toBeInTheDocument()
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
  expect(JSON.parse(String(put?.[1]?.body))).toEqual({ token: 'my-token' })
  fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))
  expect(await screen.findByText('Connected as Ann Lee')).toBeInTheDocument()
})

test('says demo tasks need no token', async () => {
  show({ provider: 'demo', base_url: null, token_state: 'none' })
  expect(await screen.findByText(/demo tasks, which need no token/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Personal access token')).toBeNull()
})

test('asks to enter a token again after the URL changed', async () => {
  show({ ...jira, token_state: 'unreadable' })
  expect(await screen.findByText(/no longer works here/)).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove token' })).toBeVisible())
})
