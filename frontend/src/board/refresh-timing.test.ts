import { expect, test } from 'vitest'
import { ApiError } from '@/api/client'
import type { Task } from '@/api/tasks'
import { lastFetched, newest, nextDelayS } from '@/board/refresh-timing'

const down = new ApiError('jira_unavailable', 'down')

test('success polls at the configured interval', () => {
  expect(nextDelayS(30, 0, null)).toBe(30)
})

test('outages double the interval up to 300 s', () => {
  expect(nextDelayS(30, 1, down)).toBe(60)
  expect(nextDelayS(30, 2, down)).toBe(120)
  expect(nextDelayS(30, 5, down)).toBe(300)
})

test('rate limits wait exactly Retry-After', () => {
  expect(nextDelayS(30, 3, new ApiError('jira_rate_limited', 'wait', 42))).toBe(42)
  expect(nextDelayS(60, 3, new ApiError('jira_rate_limited', 'wait', 5))).toBe(60)
})

test('errors the user must fix do not slow polling', () => {
  expect(nextDelayS(30, 4, new ApiError('jira_unauthorized', '401'))).toBe(30)
})

const task = (key: string, status: string, fetched_at: string): Task => ({
  key,
  state: 'ok',
  summary: '',
  status_name: status,
  status_category: 'new',
  type_name: 'Task',
  assignee_name: null,
  priority_name: null,
  updated: null,
  url: '',
  fetched_at,
})

test('newest snapshot wins regardless of source order', () => {
  const old = task('A-1', 'To Do', '2026-10-05T10:00:00+00:00')
  const fresh = task('A-1', 'Done', '2026-10-05T10:00:30+00:00')
  expect(newest([{ 'A-1': fresh }, { 'A-1': old }])['A-1'].status_name).toBe('Done')
  expect(newest([{ 'A-1': old }, { 'A-1': fresh }])['A-1'].status_name).toBe('Done')
})

test('lastFetched picks the newest stored snapshot', () => {
  const tasks = {
    'A-1': task('A-1', 'x', '2026-10-05T10:00:00+00:00'),
    'A-2': task('A-2', 'x', '2026-10-05T10:05:00+00:00'),
  }
  expect(lastFetched(tasks)).toBe(Date.parse('2026-10-05T10:05:00+00:00'))
  expect(lastFetched({})).toBe(0)
})
