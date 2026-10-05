import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Board } from '@/api/boards'
import { toDoc, useBoardDoc } from '@/canvas/useBoardDoc'
import type { AppNode } from '@/canvas/types'

const board: Board = {
  id: 'b1',
  name: 'Q4',
  updated_at: '2026-10-05T00:00:00+00:00',
  version: 1,
  doc: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  tasks: {},
}

const card = (id: string): AppNode => ({
  id,
  type: 'jira_card',
  position: { x: 0, y: 0 },
  data: { key: 'DEMO-1', collapsed: false },
})

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function sentVersions() {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).version)
}

test('toDoc keeps only persistent fields', () => {
  const node = { ...card('a'), selected: true, measured: { width: 256, height: 80 } } as AppNode
  expect(toDoc([node], [], { x: 0, y: 0, zoom: 1 }).nodes).toEqual([
    {
      id: 'a',
      type: 'jira_card',
      position: { x: 0, y: 0 },
      data: { key: 'DEMO-1', collapsed: false },
    },
  ])
})

test('opening a board does not save it', async () => {
  renderHook(() => useBoardDoc(board, vi.fn()))
  await act(() => vi.advanceTimersByTimeAsync(1000))
  expect(fetchMock).not.toHaveBeenCalled()
})

test('a change made during an in-flight save is saved next with the new version', async () => {
  let release: (r: Response) => void = () => {}
  fetchMock
    .mockReturnValueOnce(new Promise<Response>((resolve) => (release = resolve)))
    .mockResolvedValueOnce(respond(200, { version: 3 }))
  const { result } = renderHook(() => useBoardDoc(board, vi.fn()))

  act(() => result.current.setNodes([card('a')]))
  await act(() => vi.advanceTimersByTimeAsync(600))
  act(() => result.current.setNodes([card('a'), card('b')]))
  await act(() => vi.advanceTimersByTimeAsync(600))
  await act(async () => release(respond(200, { version: 2 })))
  await act(() => vi.advanceTimersByTimeAsync(0))

  expect(sentVersions()).toEqual([1, 2])
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).doc.nodes).toHaveLength(2)
})

test('a 409 calls onConflict', async () => {
  fetchMock.mockResolvedValue(respond(409, { error: { code: 'version_conflict', message: 'x' } }))
  const onConflict = vi.fn()
  const { result } = renderHook(() => useBoardDoc(board, onConflict))
  act(() => result.current.setNodes([card('a')]))
  await act(() => vi.advanceTimersByTimeAsync(600))
  expect(onConflict).toHaveBeenCalledOnce()
})

test('a failed save keeps the edit and retries', async () => {
  fetchMock
    .mockResolvedValueOnce(respond(503, { error: { code: 'internal', message: 'down' } }))
    .mockResolvedValueOnce(respond(200, { version: 2 }))
  const { result } = renderHook(() => useBoardDoc(board, vi.fn()))
  act(() => result.current.setNodes([card('a')]))
  await act(() => vi.advanceTimersByTimeAsync(600))
  expect(result.current.saveError).toBe('down')
  await act(() => vi.advanceTimersByTimeAsync(1100))
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(result.current.saveError).toBeNull()
})

test('unmount sends the pending edit', async () => {
  fetchMock.mockResolvedValue(respond(200, { version: 2 }))
  const { result, unmount } = renderHook(() => useBoardDoc(board, vi.fn()))
  act(() => result.current.setNodes([card('a')]))
  unmount()
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(fetchMock).toHaveBeenCalledOnce()
})
