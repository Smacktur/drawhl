import { expect, test } from 'vitest'
import { relativeTime } from '@/lib/time'

const now = Date.parse('2026-10-05T12:00:00Z')

test('formats past times in the largest whole unit', () => {
  expect(relativeTime('2026-10-05T11:59:30Z', now)).toBe('just now')
  expect(relativeTime('2026-10-05T11:55:00Z', now)).toBe('5 minutes ago')
  expect(relativeTime('2026-10-05T09:00:00Z', now)).toBe('3 hours ago')
  expect(relativeTime('2026-10-04T12:00:00Z', now)).toBe('yesterday')
  expect(relativeTime('2026-09-21T12:00:00Z', now)).toBe('2 weeks ago')
})

test('returns null for a missing or broken date', () => {
  expect(relativeTime(null, now)).toBeNull()
  expect(relativeTime('not a date', now)).toBeNull()
})
