import { fireEvent, render, screen } from '@testing-library/react'
import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { beforeAll, expect, test } from 'vitest'
import type { Task } from '@/api/tasks'
import { TasksContext } from '@/canvas/tasks-context'
import { JiraCardNode } from '@/canvas/nodes/JiraCardNode'
import type { JiraCardNode as JiraCardNodeType } from '@/canvas/types'

const task: Task = {
  key: 'DEMO-1',
  state: 'ok',
  summary: 'Rotate the staging certificates',
  status_name: 'In Progress',
  status_category: 'indeterminate',
  type_name: 'Task',
  assignee_name: 'Alex Doe',
  priority_name: 'High',
  updated: '2026-10-04T12:00:00Z',
  url: 'https://jira.example.com/browse/DEMO-1',
  fetched_at: '2026-10-05T07:00:00Z',
}

const nodeTypes = { jira_card: JiraCardNode }

beforeAll(() => {
  // xyflow measures nodes; jsdom has no layout.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function renderCard(data: JiraCardNodeType['data'], tasks: Record<string, Task>) {
  const node: JiraCardNodeType = { id: 'n1', type: 'jira_card', position: { x: 0, y: 0 }, data }
  render(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlowProvider>
        <TasksContext.Provider value={tasks}>
          <ReactFlow nodes={[node]} nodeTypes={nodeTypes} />
        </TasksContext.Provider>
      </ReactFlowProvider>
    </div>,
  )
}

test('expanded card shows the title and links the key to Jira', () => {
  renderCard({ key: 'DEMO-1' }, { 'DEMO-1': task })
  expect(screen.getByText('Rotate the staging certificates')).toBeTruthy()
  expect(screen.getByText('DEMO-1').closest('a')?.getAttribute('href')).toBe(task.url)
})

test('collapsed card shows the key and status only', () => {
  renderCard({ key: 'DEMO-1', collapsed: true }, { 'DEMO-1': task })
  expect(screen.getByText('DEMO-1')).toBeTruthy()
  expect(screen.getByText('In Progress')).toBeTruthy()
  expect(screen.queryByText('Rotate the staging certificates')).toBeNull()
})

test('a closed task has its key struck through', () => {
  const done = { ...task, status_name: 'Done', status_category: 'done' as const }
  renderCard({ key: 'DEMO-1', collapsed: true }, { 'DEMO-1': done })
  expect(screen.getByText('DEMO-1').className).toContain('line-through')
})

test('a missing task says so and opens no mini-card', () => {
  const missing = { ...task, state: 'not_found' as const }
  renderCard({ key: 'DEMO-1' }, { 'DEMO-1': missing })
  const label = screen.getByText('Not found or no access')
  fireEvent.pointerDown(label)
  fireEvent.click(label)
  expect(screen.queryByText('Open in Jira')).toBeNull()
})

test('a click opens the mini-card with assignee, priority and a Jira link', () => {
  renderCard({ key: 'DEMO-1', collapsed: true }, { 'DEMO-1': task })
  const key = screen.getByText('DEMO-1')
  fireEvent.pointerDown(key, { clientX: 10, clientY: 10 })
  fireEvent.click(key, { clientX: 10, clientY: 10 })
  expect(screen.getByText('Alex Doe')).toBeTruthy()
  expect(screen.getByText('High')).toBeTruthy()
  expect(screen.getByRole('link', { name: /Open in Jira/ }).getAttribute('target')).toBe('_blank')
  expect(screen.getByRole('button', { name: /Expand card/ })).toBeTruthy()
})

test('a drag does not open the mini-card', () => {
  renderCard({ key: 'DEMO-1', collapsed: true }, { 'DEMO-1': task })
  const key = screen.getByText('DEMO-1')
  fireEvent.pointerDown(key, { clientX: 10, clientY: 10 })
  fireEvent.click(key, { clientX: 60, clientY: 10 })
  expect(screen.queryByText('Open in Jira')).toBeNull()
})

test('a card without a token of your own shows only the key and how to connect', () => {
  const locked: Task = { ...task, key: 'DEV-2', state: 'no_token', summary: '', type_name: '' }
  renderCard({ key: 'DEV-2' }, { 'DEV-2': locked })
  // xyflow keeps unmeasured nodes out of the accessibility tree, so find it by text.
  fireEvent.click(screen.getByText('Connect your Jira token to see this task'))
  expect(new URL(window.location.href).searchParams.get('settings')).toBe('tracker')
})
