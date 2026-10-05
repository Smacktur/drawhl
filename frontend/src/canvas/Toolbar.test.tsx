import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { Toolbar } from '@/canvas/Toolbar'

const task = {
  key: 'DEMO-1',
  state: 'ok',
  summary: 'Rotate the staging certificates',
  status_name: 'To Do',
  status_category: 'new',
  type_name: 'Task',
  assignee_name: null,
  priority_name: null,
  updated: null,
  url: 'https://jira.example.com/browse/DEMO-1',
  fetched_at: '2026-10-05T07:00:00Z',
}

afterEach(() => vi.unstubAllGlobals())

function renderToolbar(onAddCards = vi.fn(), onTool = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Toolbar tool="select" onTool={onTool} onAddCards={onAddCards} />
    </QueryClientProvider>,
  )
  return onAddCards
}

test('has no card input until the Jira card tool is picked', () => {
  renderToolbar()
  expect(screen.queryByLabelText('Issue keys or links')).toBeNull()
})

test('adds a card from the popover and closes it', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ task }), { status: 200 })),
  )
  const onAddCards = renderToolbar()
  fireEvent.click(screen.getByRole('button', { name: 'Jira card' }))
  const field = await screen.findByLabelText('Issue keys or links')
  fireEvent.change(field, { target: { value: 'DEMO-1' } })
  fireEvent.submit(field)

  await waitFor(() => expect(onAddCards).toHaveBeenCalledWith([task]))
  await waitFor(() => expect(screen.queryByLabelText('Issue keys or links')).toBeNull())
})

test('closes the popover on Escape', async () => {
  renderToolbar()
  fireEvent.click(screen.getByRole('button', { name: 'Jira card' }))
  const field = await screen.findByLabelText('Issue keys or links')
  fireEvent.keyDown(field, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByLabelText('Issue keys or links')).toBeNull())
})

test('adds several cards at once and keeps the ones that failed in the field', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const { ref } = JSON.parse(init.body as string)
      if (ref === 'NOPE') {
        return new Response(
          JSON.stringify({ error: { code: 'invalid_ref', message: 'Not a Jira key or link' } }),
          { status: 422 },
        )
      }
      return new Response(JSON.stringify({ task: { ...task, key: ref } }), { status: 200 })
    }),
  )
  const onAddCards = renderToolbar()
  fireEvent.click(screen.getByRole('button', { name: 'Jira card' }))
  const field = await screen.findByLabelText('Issue keys or links')
  fireEvent.change(field, { target: { value: 'DEMO-1, DEMO-2,NOPE DEMO-1' } })
  fireEvent.submit(field)

  await waitFor(() => expect(onAddCards).toHaveBeenCalledWith([task, { ...task, key: 'DEMO-2' }]))
  expect(await screen.findByRole('alert')).toHaveTextContent('NOPE:')
  expect(screen.getByLabelText('Issue keys or links')).toHaveValue('NOPE')
})

test('picks tools from the keyboard', () => {
  const onTool = vi.fn()
  renderToolbar(vi.fn(), onTool)
  fireEvent.keyDown(document, { key: 'f', code: 'KeyF' })
  expect(onTool).toHaveBeenCalledWith('frame')
  expect(screen.getByRole('button', { name: 'Frame' })).toHaveAttribute('title', 'Frame (F)')
})
