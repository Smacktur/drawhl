import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )
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
