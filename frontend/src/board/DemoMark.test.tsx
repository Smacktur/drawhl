import { expect, test } from 'vitest'
import { demoDaysLeft } from '@/board/DemoMark'

const now = Date.parse('2026-10-11T10:00:00Z')

test('counts the days a demo board is still kept', () => {
  expect(demoDaysLeft('2026-10-18T10:00:00+00:00', now)).toBe('7 days')
  expect(demoDaysLeft('2026-10-12T09:00:00+00:00', now)).toBe('1 day')
  expect(demoDaysLeft('2026-10-11T10:05:00+00:00', now)).toBe('1 day')
})
