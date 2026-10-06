import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { ReactFlow, ReactFlowProvider, useNodesState, type Node } from '@xyflow/react'
import { useLayoutEffect } from 'react'
import { beforeAll, expect, test, vi } from 'vitest'
import type { Task } from '@/api/tasks'
import { ModuleNode } from '@/canvas/nodes/ModuleNode'
import { TasksContext } from '@/canvas/tasks-context'
import type { AppNode } from '@/canvas/types'
import { ModuleHostContext } from '@/modules/host-context'
import type { GanttContent } from '@/modules/gantt/schema'
import type { ModuleHost } from '@/modules/types'

const nodeTypes = { module: ModuleNode }

beforeAll(() => {
  // xyflow measures nodes and bars capture the pointer; jsdom has neither.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.setPointerCapture ??= () => {}
})

const task: Task = {
  key: 'DEMO-1',
  state: 'ok',
  summary: 'Rotate the staging certificates',
  status_name: 'Done',
  status_category: 'done',
  type_name: 'Task',
  assignee_name: null,
  priority_name: null,
  updated: null,
  url: 'https://jira.example.com/browse/DEMO-1',
  fetched_at: '2026-10-05T07:00:00Z',
}

const content: GanttContent = {
  start: '2026-10-01',
  end: '2026-12-31',
  scale: 'week',
  labelWidth: 160,
  rows: [
    { id: 'a', key: 'DEMO-1', title: '', start: '2026-10-05', end: '2026-10-09' },
    { id: 'b', title: 'Design review', start: '2026-10-12', end: '2026-10-14' },
  ],
  milestones: [],
  links: [],
}

let latest: Node[] = []

function Board() {
  const [nodes, , onNodesChange] = useNodesState<AppNode>([
    {
      id: 'g',
      type: 'module',
      position: { x: 0, y: 0 },
      width: 960,
      height: 320,
      selected: true,
      data: { kind: 'gantt', content },
    },
  ])
  useLayoutEffect(() => {
    latest = nodes
  }, [nodes])
  return <ReactFlow nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange} />
}

function renderGantt(host: Partial<ModuleHost> = {}) {
  const full: ModuleHost = { addTasks: vi.fn(), ejectCard: vi.fn(), ejectNote: vi.fn(), ...host }
  render(
    <div style={{ width: 1200, height: 800 }}>
      <QueryClientProvider client={new QueryClient()}>
        <ReactFlowProvider>
          <TasksContext.Provider value={{ 'DEMO-1': task }}>
            <ModuleHostContext.Provider value={full}>
              <Board />
            </ModuleHostContext.Provider>
          </TasksContext.Provider>
        </ReactFlowProvider>
      </QueryClientProvider>
    </div>,
  )
  return full
}

const rows = () => (latest[0].data as { content: GanttContent }).content.rows

test('shows task rows with live data and plain rows with their title', () => {
  renderGantt()
  expect(screen.getByText('Rotate the staging certificates')).toBeTruthy()
  expect(screen.getByRole('slider', { name: 'Design review dates' })).toBeTruthy()
  const bar = screen.getByRole('slider', { name: /DEMO-1/ })
  expect(bar.className).toContain('bg-status-done')
  expect(bar.className).toContain('line-through')
})

test('adds a plain row and removes a row', () => {
  renderGantt()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Plain task' }))
  const field = screen.getByLabelText('Title')
  fireEvent.change(field, { target: { value: 'Kickoff' } })
  fireEvent.submit(field)
  expect(rows().map((r) => r.title)).toContain('Kickoff')
  expect(rows()).toHaveLength(3)
  fireEvent.click(screen.getByRole('button', { name: 'Remove Design review' }))
  expect(rows().map((r) => r.id)).not.toContain('b')
})

test('renames a plain row in place', () => {
  renderGantt()
  // The label comes before the bar, which shows the same title.
  fireEvent.doubleClick(screen.getAllByText('Design review')[0])
  const field = screen.getByLabelText('Row title')
  fireEvent.change(field, { target: { value: 'Security review' } })
  fireEvent.blur(field)
  expect(rows()[1].title).toBe('Security review')
})

test('a row dragged out of the module goes back to the board', () => {
  const host = renderGantt()
  const label = screen.getByText('DEMO-1')
  fireEvent.pointerDown(label, { clientX: 10, clientY: 10, pointerId: 1 })
  fireEvent.pointerMove(label, { clientX: 2000, clientY: 2000, pointerId: 1 })
  fireEvent.pointerUp(label, { clientX: 2000, clientY: 2000, pointerId: 1 })
  expect(host.ejectCard).toHaveBeenCalledWith('DEMO-1', { x: 2000, y: 2000 })
  expect(rows().map((r) => r.id)).toEqual(['b'])
})

test('the task column is resized by dragging its border, within limits', () => {
  renderGantt()
  const grip = screen.getByRole('separator', { name: 'Resize the task column' })
  fireEvent.pointerDown(grip, { clientX: 160, pointerId: 1 })
  fireEvent.pointerMove(grip, { clientX: 260, pointerId: 1 })
  fireEvent.pointerUp(grip, { pointerId: 1 })
  const width = () => (latest[0].data as { content: GanttContent }).content.labelWidth
  expect(width()).toBe(260)
  fireEvent.pointerDown(grip, { clientX: 260, pointerId: 1 })
  fireEvent.pointerMove(grip, { clientX: -500, pointerId: 1 })
  expect(width()).toBe(120)
})

test('the module title is renamed in its header', () => {
  renderGantt()
  fireEvent.doubleClick(screen.getByText('Gantt'))
  const field = screen.getByLabelText('Gantt')
  fireEvent.change(field, { target: { value: 'Q4 roadmap' } })
  fireEvent.blur(field)
  expect((latest[0].data as { title?: string }).title).toBe('Q4 roadmap')
  expect(screen.getByText('Q4 roadmap')).toBeTruthy()
})

test('rows nest under rows, show a summary bar and collapse', () => {
  renderGantt()
  fireEvent.click(screen.getByRole('button', { name: 'Indent Design review' }))
  expect(rows()[1].parent).toBe('a')
  expect(screen.getByRole('slider', { name: /DEMO-1 .* summary/ })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Add a task under Design review' }))
  expect(rows().map((r) => r.parent)).toEqual([undefined, 'a', 'b'])
  fireEvent.blur(screen.getByLabelText('Row title'))

  fireEvent.click(screen.getByRole('button', { name: 'Collapse DEMO-1' }))
  expect(rows()[0].collapsed).toBe(true)
  expect(screen.queryByRole('slider', { name: 'Design review dates' })).toBeNull()
})

test('removing a parent keeps its children one level up', () => {
  renderGantt()
  fireEvent.click(screen.getByRole('button', { name: 'Indent Design review' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove DEMO-1' }))
  expect(rows()).toEqual([expect.objectContaining({ id: 'b' })])
  expect(rows()[0].parent).toBeUndefined()
})

test('a task row links to the tracker from its own button only', () => {
  renderGantt()
  const link = screen.getByRole('link', { name: 'Open DEMO-1 in the tracker' })
  expect(link.getAttribute('href')).toBe(task.url)
  expect(screen.getByText('DEMO-1').closest('a')).toBeNull()
})

test('a task that becomes a parent keeps its key, title and status color', () => {
  renderGantt()
  fireEvent.click(screen.getByRole('button', { name: 'Indent Design review' }))
  const summary = screen.getByRole('slider', { name: /DEMO-1 .* summary/ })
  expect(summary.textContent).toContain('Rotate the staging certificates')
  expect(summary.className).toContain('bg-status-done')
})

test('dragging a parent moves its whole branch', () => {
  renderGantt()
  fireEvent.click(screen.getByRole('button', { name: 'Indent Design review' }))
  const summary = screen.getByRole('slider', { name: /DEMO-1 .* summary/ })
  // 92 days over 800px: about 8.7px a day, so 87px is ten days.
  fireEvent.pointerDown(summary, { clientX: 100, pointerId: 1 })
  fireEvent.pointerMove(summary, { clientX: 187, pointerId: 1 })
  fireEvent.pointerUp(summary, { pointerId: 1 })
  expect(rows().map((r) => [r.start, r.end])).toEqual([
    ['2026-10-15', '2026-10-19'],
    ['2026-10-22', '2026-10-24'],
  ])
})
