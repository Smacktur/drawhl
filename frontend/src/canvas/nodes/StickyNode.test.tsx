import { fireEvent, render, screen } from '@testing-library/react'
import { ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react'
import { beforeAll, expect, test } from 'vitest'
import { STICKY_MAX_CHARS } from '@/canvas/fit'
import { StickyNode } from '@/canvas/nodes/StickyNode'
import { ReadOnlyContext } from '@/canvas/readonly'
import type { AppNode } from '@/canvas/types'

const nodeTypes = { sticky: StickyNode }

beforeAll(() => {
  // xyflow measures nodes; jsdom has no layout.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function Board({ text }: { text: string }) {
  const [nodes, , onNodesChange] = useNodesState<AppNode>([
    {
      id: 's',
      type: 'sticky',
      position: { x: 0, y: 0 },
      width: 200,
      height: 200,
      data: { text, color: 'yellow' },
    },
  ])
  return <ReactFlow nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange} />
}

function editNote(text: string) {
  render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <Board text={text} />
      </div>
    </ReactFlowProvider>,
  )
  fireEvent.doubleClick(screen.getByText(text))
  return screen.getByRole('textbox', { name: 'Note' }) as HTMLTextAreaElement
}

test('a note takes at most the character limit', () => {
  const field = editNote('Short')
  expect(field.maxLength).toBe(STICKY_MAX_CHARS)
})

test('pasting past the limit shows the no entry sign', () => {
  const field = editNote('x'.repeat(STICKY_MAX_CHARS - 3))
  field.setSelectionRange(field.value.length, field.value.length)
  fireEvent.paste(field, { clipboardData: { getData: () => 'abc' } })
  expect(document.querySelector('.sticky-blocked')).toBeNull()
  fireEvent.paste(field, { clipboardData: { getData: () => 'abcd' } })
  expect(document.querySelector('.sticky-blocked')).not.toBeNull()
})

test('a read-only board opens no editor and no color picker', () => {
  render(
    <ReadOnlyContext.Provider value={true}>
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <Board text="Look only" />
        </div>
      </ReactFlowProvider>
    </ReadOnlyContext.Provider>,
  )
  fireEvent.doubleClick(screen.getByText('Look only'))
  expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull()
})
