import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { BoardRole } from '@/api/boards'
import { ShareDialog } from '@/board/ShareDialog'

const user = (id: string, name: string) => ({ id, username: name.toLowerCase(), name })
const members = {
  members: [
    { user: user('u1', 'Ann'), role: 'owner' },
    { user: user('u2', 'Bob'), role: 'editor' },
  ],
  everyone_role: null,
}

afterEach(() => vi.unstubAllGlobals())

function show(myRole: BoardRole) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/boards/b1/members') return Response.json(members)
    if (url.startsWith('/api/people/directory'))
      return Response.json({ people: [user('u2', 'Bob'), user('u3', 'Carl')] })
    if (init?.method === 'PUT' && url.includes('/members/'))
      return Response.json({ user: user('u3', 'Carl'), role: 'editor' })
    return new Response(null, { status: 204 })
  })
  vi.stubGlobal('fetch', fetchMock)
  const board = {
    id: 'b1',
    name: 'Sprint',
    updated_at: '',
    my_role: myRole,
    owner: { id: 'u1', name: 'Ann' },
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ShareDialog board={board} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  )
  return fetchMock
}

const calls = (fetchMock: ReturnType<typeof show>) =>
  fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)

test('the owner adds a person who is not on the board yet', async () => {
  const fetchMock = show('owner')
  fireEvent.change(await screen.findByLabelText('Add people'), { target: { value: 'c' } })
  const list = await screen.findByRole('list', { name: 'Matching people' })
  expect(list).toHaveTextContent('Carl')
  expect(list).not.toHaveTextContent('Bob')
  fireEvent.click(screen.getByRole('button', { name: /Carl/ }))
  await waitFor(() => expect(calls(fetchMock)).toContain('PUT /api/boards/b1/members/u3'))
})

test('the owner lets everyone view the board', async () => {
  const fetchMock = show('owner')
  fireEvent.keyDown(await screen.findByRole('button', { name: /No access/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Can view' }))
  await waitFor(() => expect(calls(fetchMock)).toContain('PUT /api/boards/b1/everyone'))
})

test('others see who has access but cannot change it', async () => {
  show('editor')
  expect(await screen.findByText('Bob')).toBeInTheDocument()
  expect(screen.getByText('Only the owner can change who has access.')).toBeInTheDocument()
  expect(screen.queryByLabelText('Add people')).toBeNull()
  expect(screen.queryByRole('button', { name: /Can edit/ })).toBeNull()
})
