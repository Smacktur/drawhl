import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { AcceptInvite, readInviteLink } from '@/auth/AcceptInvite'

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

function show(kind: 'invite' | 'reset', reply: Response) {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
    url.endsWith('/accept') ? new Response(null, { status: 204 }) : reply.clone(),
  )
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AcceptInvite link={{ kind, token: 'tok' }} />
    </QueryClientProvider>,
  )
  return fetchMock
}

test('reads the link from the address', () => {
  window.history.replaceState(null, '', '/?reset=abc')
  expect(readInviteLink()).toEqual({ kind: 'reset', token: 'abc' })
  window.history.replaceState(null, '', '/?board=x')
  expect(readInviteLink()).toBeNull()
})

test('joins with a username, a name and a password', async () => {
  const fetchMock = show(
    'invite',
    Response.json({ kind: 'invite', role: 'member', username: null }),
  )
  fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Ann Lee' } })
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ann ' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-enough-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Join tiko' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  const [url, init] = fetchMock.mock.calls[1]
  expect(url).toBe('/api/invites/tok/accept')
  expect(JSON.parse(String(init?.body))).toEqual({
    username: 'ann',
    name: 'Ann Lee',
    password: 'long-enough-password',
  })
})

test('asks only for a new password on a reset link', async () => {
  show('reset', Response.json({ kind: 'reset', role: null, username: 'ann' }))
  expect(await screen.findByText('Set a new password for ann.')).toBeInTheDocument()
  expect(screen.getByLabelText('New password')).toBeInTheDocument()
  expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
})

test('says when a link has expired', async () => {
  const message = 'This invite link has expired. Ask your admin for a new one.'
  show('invite', Response.json({ error: { code: 'invite_expired', message } }, { status: 410 }))
  expect(await screen.findByText(message)).toBeInTheDocument()
})
