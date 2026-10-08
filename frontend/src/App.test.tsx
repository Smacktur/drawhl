import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { AUTH_REQUIRED_EVENT } from '@/api/client'

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

type Reply = { status: number; body: unknown }

// The boards reply stands for every route except the auth ones.
function mockFetch(status: number, body: unknown, auth: Partial<Record<string, Reply>> = {}) {
  const routes: Record<string, Reply> = {
    '/api/auth/status': { status: 200, body: { signed_in: true } },
    ...auth,
  }
  const fetch = vi.fn(async (path: string) => {
    const reply = routes[path] ?? { status, body }
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.body), {
      status: reply.status,
    })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

test('offers to create the first board', async () => {
  mockFetch(200, { boards: [] })
  renderApp()
  expect(await screen.findByText(/Create a board/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /New board/ })).toBeDisabled()
})

test('shows the unified API error message', async () => {
  mockFetch(503, { error: { code: 'dependency_unavailable', message: 'database is down' } })
  renderApp()
  expect(await screen.findByText('database is down')).toBeInTheDocument()
})

test('asks for the password and opens the boards after signing in', async () => {
  const fetch = mockFetch(
    200,
    { boards: [] },
    {
      '/api/auth/status': { status: 200, body: { signed_in: false } },
      '/api/auth/login': { status: 204, body: null },
    },
  )
  renderApp()
  const password = await screen.findByLabelText('Password')
  expect(fetch.mock.calls.map(([path]) => path)).not.toContain('/api/boards')
  fireEvent.change(password, { target: { value: 'pw' } })
  fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
  expect(await screen.findByText(/Create a board/)).toBeInTheDocument()
})

test('names a wrong password', async () => {
  mockFetch(
    200,
    { boards: [] },
    {
      '/api/auth/status': { status: 200, body: { signed_in: false } },
      '/api/auth/login': {
        status: 401,
        body: { error: { code: 'invalid_password', message: 'wrong password' } },
      },
    },
  )
  renderApp()
  fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'nope' } })
  fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
  expect(await screen.findByText('Wrong password. Try again.')).toBeInTheDocument()
})

test('drops back to the sign-in screen when the session is gone', async () => {
  mockFetch(200, { boards: [] })
  renderApp()
  await screen.findByText(/Create a board/)
  act(() => {
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
  })
  expect(await screen.findByLabelText('Password')).toBeInTheDocument()
})
