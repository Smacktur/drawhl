import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { AppNode } from '@/canvas/types'
import { Faces } from '@/live/Avatar'
import { remoteDrags, withRemoteMotion } from '@/live/drags'
import {
  PRESENCE_COLORS,
  colorOf,
  initials,
  parsePeers,
  peopleOf,
  presenceSender,
  selectedBy,
  throttle,
  type Peer,
} from '@/live/presence'

const user = (id: string, name: string) => ({ id, name, color: colorOf(id) })
const state = (id: string, name: string, extra: object = {}) => ({
  user: user(id, name),
  cursor: null,
  selected: [],
  drag: null,
  ...extra,
})

test('a person keeps one color, one of eight', () => {
  const ids = Array.from({ length: 200 }, (_, i) => `user-${i}`)
  for (const id of ids) {
    expect(colorOf(id)).toBe(colorOf(id))
    expect(colorOf(id)).toBeGreaterThanOrEqual(0)
    expect(colorOf(id)).toBeLessThan(PRESENCE_COLORS)
  }
  expect(new Set(ids.map(colorOf)).size).toBe(PRESENCE_COLORS)
})

test('initials', () => {
  expect(initials('Ann Lee')).toBe('AL')
  expect(initials('  ann  maria  lee ')).toBe('AL')
  expect(initials('bob')).toBe('BO')
  expect(initials('')).toBe('?')
})

test('peers: this tab is left out, a broken state is skipped, bad fields fall back', () => {
  const states = new Map<number, unknown>([
    [1, state('me', 'Me')],
    [
      2,
      state('u2', 'Bob', { cursor: { x: 1, y: 2 }, selected: ['a'], drag: { a: { x: 5, y: 6 } } }),
    ],
    [3, { user: { id: 'u3' } }],
    [4, state('u4', 'Carl', { cursor: 'nowhere', selected: 7, drag: 'x' })],
    [5, null],
  ])
  const peers = parsePeers(states, 1)
  expect(peers.map((peer) => peer.client)).toEqual([2, 4])
  expect(peers[0]).toMatchObject({ cursor: { x: 1, y: 2 }, selected: ['a'] })
  expect(peers[1]).toMatchObject({ cursor: null, selected: [], drag: null })
})

test('people: one per person across tabs, without this person', () => {
  const peers = [
    { ...state('u2', 'Bob'), client: 2 },
    { ...state('u2', 'Bob'), client: 3 },
    { ...state('me', 'Me'), client: 4 },
    { ...state('u1', 'Ann'), client: 5 },
  ] as Peer[]
  expect(peopleOf(peers, 'me').map((person) => person.name)).toEqual(['Ann', 'Bob'])
})

test('faces: five avatars, then a count with the other names', () => {
  const people = [
    'Ann Lee',
    'Bob Ray',
    'Carl Fox',
    'Dana Kim',
    'Eve Orr',
    'Finn Day',
    'Gus Poe',
  ].map((name, index) => user(`u${index}`, name))
  render(<Faces people={people} />)
  expect(screen.getByLabelText('Ann Lee').textContent).toBe('AL')
  expect(screen.getAllByTitle(/.+/).length).toBe(6)
  expect(screen.getByText('+2').title).toBe('Finn Day, Gus Poe')
  expect(screen.queryByLabelText('Finn Day')).toBeNull()
})

test('faces: nothing when nobody else is here', () => {
  const { container } = render(<Faces people={[]} />)
  expect(container.innerHTML).toBe('')
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('throttle: the first call at once, then the latest value once per interval', () => {
  const seen: number[] = []
  const send = throttle((value: number) => seen.push(value), 50)
  send(1)
  send(2)
  send(3)
  expect(seen).toEqual([1])
  vi.advanceTimersByTime(50)
  expect(seen).toEqual([1, 3])
  send(4)
  send.cancel()
  vi.advanceTimersByTime(100)
  expect(seen).toEqual([1, 3])
})

const node = (id: string, extra: Partial<AppNode> = {}): AppNode =>
  ({
    id,
    type: 'sticky',
    position: { x: 0, y: 0 },
    data: { text: '', color: 'yellow' },
    ...extra,
  }) as AppNode

test('a node someone drags follows them on screen; the board state is untouched', () => {
  const nodes = [
    node('a'),
    node('in', { parentId: 'f' }),
    node('mine', { dragging: true }),
    node('b'),
  ]
  const peers = [
    {
      ...state('u2', 'Bob', {
        drag: { a: { x: 50, y: 60 }, in: { x: 130, y: 140 }, mine: { x: 9, y: 9 } },
      }),
      client: 2,
    },
  ] as Peer[]
  const shown = withRemoteMotion(nodes, remoteDrags(peers), new Set(['b']), () => ({
    x: 100,
    y: 100,
  }))
  expect(shown[0]).toMatchObject({ position: { x: 50, y: 60 }, className: 'node-glide-drag' })
  // A child is placed relative to its frame.
  expect(shown[1].position).toEqual({ x: 30, y: 40 })
  // What this person drags themselves is theirs.
  expect(shown[2]).toBe(nodes[2])
  expect(shown[3]).toMatchObject({ position: { x: 0, y: 0 }, className: 'node-glide' })
  expect(nodes[0].position).toEqual({ x: 0, y: 0 })
  expect(withRemoteMotion(nodes, new Map(), new Set(), () => undefined)).toBe(nodes)
})

test('cursor and drag leave in one message, so a dragged node stays under its cursor', () => {
  const sent: object[] = []
  const mine = presenceSender((patch) => sent.push(patch))
  mine.cursor({ x: 1, y: 1 })
  mine.cursor({ x: 2, y: 2 })
  mine.drag({ a: { x: 5, y: 5 } })
  vi.advanceTimersByTime(50)
  expect(sent).toEqual([
    { cursor: { x: 1, y: 1 } },
    { cursor: { x: 2, y: 2 }, drag: { a: { x: 5, y: 5 } } },
  ])
  mine.drag(null)
  vi.advanceTimersByTime(50)
  expect(sent[2]).toEqual({ drag: null })
})

test('who has a node selected: each person once, in the order they are known', () => {
  const peers = [
    { ...state('u1', 'Ann', { selected: ['a', 'b'] }), client: 1 },
    { ...state('u1', 'Ann', { selected: ['a'] }), client: 2 },
    { ...state('u2', 'Bob', { selected: ['a'] }), client: 3 },
  ] as Peer[]
  const by = selectedBy(peers)
  expect(by.get('a')?.map((person) => person.name)).toEqual(['Ann', 'Bob'])
  expect(by.get('b')?.map((person) => person.name)).toEqual(['Ann'])
  expect(by.get('c')).toBeUndefined()
})

test('what a dragged frame carries moves the same way as the frame', () => {
  const nodes = [
    node('f', { type: 'frame' } as Partial<AppNode>),
    node('in', { parentId: 'f' }),
    node('timer', { parentId: 'in' }),
    node('out'),
  ]
  const dragged = withRemoteMotion(
    nodes,
    new Map([['f', { x: 5, y: 5 }]]),
    new Set(),
    () => undefined,
  )
  expect(dragged.map((n) => n.className)).toEqual([
    'node-glide-drag',
    'node-glide-drag',
    'node-glide-drag',
    undefined,
  ])
  // Children keep their place inside the frame; only the frame's own position is overridden.
  expect(dragged[1].position).toEqual({ x: 0, y: 0 })
  const glided = withRemoteMotion(nodes, new Map(), new Set(['f']), () => undefined)
  expect(glided.map((n) => n.className)).toEqual([
    'node-glide',
    'node-glide',
    'node-glide',
    undefined,
  ])
})
