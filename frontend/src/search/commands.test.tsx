import { act, renderHook } from '@testing-library/react'
import { Moon, Plus, StickyNote } from 'lucide-react'
import { expect, test, vi } from 'vitest'
import { matchCommands, useCommandList, useCommands, type Command } from './commands'
import { words } from './match'

const command = (id: string, title: string, extra: Partial<Command> = {}): Command => ({
  id,
  title,
  group: 'Commands',
  Icon: Plus,
  run: () => {},
  ...extra,
})

test('matches commands by title and keywords, best first', () => {
  const list = [
    command('a', 'Add sticky note', { Icon: StickyNote }),
    command('b', 'Switch to dark theme', { Icon: Moon, keywords: 'appearance mode' }),
    command('c', 'Add text'),
  ]
  const ids = (q: string) => matchCommands(list, words(q)).map((c) => c.id)
  expect(ids('add')).toEqual(['a', 'c'])
  expect(ids('mode')).toEqual(['b'])
  expect(ids('text')).toEqual(['c'])
  expect(ids('')).toEqual(['a', 'b', 'c'])
})

test('a component offers its commands while mounted and runs the latest handler', () => {
  const first = vi.fn()
  const second = vi.fn()
  const list = renderHook(() => useCommandList())
  const owner = renderHook(({ run }) => useCommands([command('x', 'Do it', { run })]), {
    initialProps: { run: first },
  })
  expect(list.result.current.map((c) => c.id)).toEqual(['x'])
  owner.rerender({ run: second })
  act(() => list.result.current[0].run())
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalled()
  owner.unmount()
  expect(list.result.current).toEqual([])
})
