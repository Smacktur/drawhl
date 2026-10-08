import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { TopBar } from '@/board/TopBar'

const boards = [
  { id: 'a', name: 'Q4 goals', updated_at: '2026-10-05T07:00:00Z' },
  { id: 'b', name: 'Team Platform', updated_at: '2026-10-05T07:00:00Z' },
]

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

function renderBar(onSelect = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TopBar boards={boards} current={boards[0]} onSelect={onSelect} />
    </QueryClientProvider>,
  )
  return onSelect
}

test('switches boards from the board menu', async () => {
  const onSelect = renderBar()
  fireEvent.keyDown(screen.getByRole('button', { name: /Q4 goals/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Team Platform' }))
  expect(onSelect).toHaveBeenCalledWith('b')
})

test('switches to the dark theme from the main menu', async () => {
  renderBar()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Main menu' }), { key: 'Enter' })
  fireEvent.keyDown(await screen.findByRole('menuitem', { name: 'Theme' }), { key: 'ArrowRight' })
  fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Dark' }))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('drawhl.theme')).toBe('dark')
})

test('opens the shortcut list with ?', async () => {
  renderBar()
  fireEvent.keyDown(document, { key: '?', code: 'Slash', shiftKey: true })
  const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
  expect(dialog).toHaveTextContent('Duplicate')
})

test('renames the current board inline', async () => {
  const fetch = vi.fn(
    async () => new Response(JSON.stringify({ ...boards[0], name: 'Q1 goals' }), { status: 200 }),
  )
  vi.stubGlobal('fetch', fetch)
  renderBar()
  fireEvent.keyDown(screen.getByRole('button', { name: /Q4 goals/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename board' }))
  const field = await screen.findByLabelText('Board name')
  fireEvent.change(field, { target: { value: 'Q1 goals' } })
  fireEvent.submit(field)
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/boards/a',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Q1 goals' }) }),
    ),
  )
  vi.unstubAllGlobals()
})

test('deletes a board only after confirming', async () => {
  const fetch = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetch)
  renderBar()
  fireEvent.keyDown(screen.getByRole('button', { name: /Q4 goals/ }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete board…' }))
  expect(await screen.findByText(/"Q4 goals" and everything on it/)).toBeTruthy()
  expect(fetch).not.toHaveBeenCalledWith('/api/boards/a', expect.anything())
  fireEvent.click(screen.getByRole('button', { name: 'Delete board' }))
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/boards/a',
      expect.objectContaining({ method: 'DELETE' }),
    ),
  )
  vi.unstubAllGlobals()
})

test('shows who is signed in and opens settings with mod+comma', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        signed_in: true,
        me: { id: 'u1', username: 'ann', name: 'Ann Lee', role: 'member' },
      }),
    ),
  )
  renderBar()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Main menu' }), { key: 'Enter' })
  expect(await screen.findByText('Ann Lee')).toBeInTheDocument()
  expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  fireEvent.keyDown(document, { key: ',', code: 'Comma', metaKey: true, ctrlKey: true })
  await waitFor(() =>
    expect(new URL(window.location.href).searchParams.get('settings')).toBe('profile'),
  )
  vi.unstubAllGlobals()
})
