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

function renderToolbar(onAddCard = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Toolbar tool="select" onTool={vi.fn()} onAddCard={onAddCard} />
    </QueryClientProvider>,
  )
  return onAddCard
}

test('has no card input until the Jira card tool is picked', () => {
  renderToolbar()
  expect(screen.queryByLabelText('Issue key or link')).toBeNull()
})

test('adds a card from the popover and closes it', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ task }), { status: 200 })),
  )
  const onAddCard = renderToolbar()
  fireEvent.click(screen.getByRole('button', { name: 'Jira card' }))
  const field = await screen.findByLabelText('Issue key or link')
  fireEvent.change(field, { target: { value: 'DEMO-1' } })
  fireEvent.submit(field)

  await waitFor(() => expect(onAddCard).toHaveBeenCalledWith(task))
  await waitFor(() => expect(screen.queryByLabelText('Issue key or link')).toBeNull())
})

test('closes the popover on Escape', async () => {
  renderToolbar()
  fireEvent.click(screen.getByRole('button', { name: 'Jira card' }))
  const field = await screen.findByLabelText('Issue key or link')
  fireEvent.keyDown(field, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByLabelText('Issue key or link')).toBeNull())
})
