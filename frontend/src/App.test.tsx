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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

afterEach(() => vi.unstubAllGlobals())

test('shows greeting from the API', async () => {
  mockFetch(200, { message: 'Hello, world!' })
  renderApp()
  expect(await screen.findByTestId('greeting')).toHaveTextContent('Hello, world!')
})

test('shows the unified API error message', async () => {
  mockFetch(422, { error: { code: 'validation_failed', message: 'name must not be blank' } })
  renderApp()
  expect(await screen.findByText('name must not be blank')).toBeInTheDocument()
})
