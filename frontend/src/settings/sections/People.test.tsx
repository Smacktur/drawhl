import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { People } from '@/settings/sections/People'

const me = { id: 'u1', username: 'admin', name: 'Admin', role: 'admin' as const }
const ann = {
  id: 'u2',
  username: 'ann',
  name: 'Ann Lee',
  role: 'member',
  disabled: false,
  last_sign_in_at: null,
  created_at: '2026-10-08T10:00:00+00:00',
}
const invite = {
  id: 'i1',
  kind: 'invite',
  role: 'member',
  username: null,
  expires_at: '2026-10-15T10:00:00+00:00',
  created_at: '2026-10-08T10:00:00+00:00',
}

afterEach(() => vi.unstubAllGlobals())

function mockApi() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/people')
      return Response.json({
        people: [{ ...me, disabled: false, last_sign_in_at: null, created_at: '' }, ann],
        invites: [invite],
      })
    if (url === '/api/invites' && init?.method === 'POST')
      return Response.json({ invite, url: '/?invite=tok123' }, { status: 201 })
    if (url === '/api/people/u2' && init?.method === 'PATCH')
      return Response.json({ ...ann, ...JSON.parse(String(init.body)) })
    if (url === '/api/invites/i1') return new Response(null, { status: 204 })
    return Response.json({}, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <People me={me} />
    </QueryClientProvider>,
  )
  return fetchMock
}

const methods = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)

test('lists people and open links', async () => {
  mockApi()
  expect(await screen.findByText('Ann Lee')).toBeInTheDocument()
  expect(screen.getByText(/\(you\)/)).toBeInTheDocument()
  expect(screen.getByText(/ann · Never signed in/)).toBeInTheDocument()
  expect(screen.getByText('Invite as member')).toBeInTheDocument()
})

test('shows a new invite link once, with the full address', async () => {
  const fetchMock = mockApi()
  await screen.findByText('Ann Lee')
  fireEvent.keyDown(screen.getByRole('button', { name: 'Invite' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'As member' }))
  const field = await screen.findByLabelText('Link')
  expect(field).toHaveValue(`${window.location.origin}/?invite=tok123`)
  expect(methods(fetchMock)).toContain('POST /api/invites')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.queryByLabelText('Link')).not.toBeInTheDocument()
})

test('disables a person from the row menu', async () => {
  const fetchMock = mockApi()
  await screen.findByText('Ann Lee')
  fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Ann Lee' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Disable' }))
  await waitFor(() => expect(methods(fetchMock)).toContain('PATCH /api/people/u2'))
  const call = fetchMock.mock.calls.find(([url, init]) => url === '/api/people/u2' && init?.method)
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({ disabled: true })
})

test('revokes an open link', async () => {
  const fetchMock = mockApi()
  const row = (await screen.findByText('Invite as member')).closest('li')!
  fireEvent.click(within(row).getByRole('button', { name: 'Revoke' }))
  await waitFor(() => expect(methods(fetchMock)).toContain('DELETE /api/invites/i1'))
})
