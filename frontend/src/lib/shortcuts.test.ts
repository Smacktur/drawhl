import { expect, test } from 'vitest'
import { formatShortcut, withShortcut } from '@/lib/shortcuts'

test('shortcuts read as keys for the help dialog and tooltips', () => {
  expect(formatShortcut('remove')).toEqual([['Delete'], ['Backspace']])
  expect(formatShortcut('help')).toEqual([['?']])
  expect(formatShortcut('duplicate')[0][1]).toBe('D')
  expect(withShortcut('frame')).toBe('Frame (F)')
})
