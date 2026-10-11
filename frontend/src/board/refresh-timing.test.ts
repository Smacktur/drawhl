import { expect, test } from 'vitest'
import type { SyncSource } from '@/api/boards'
import type { Task } from '@/api/tasks'
import { lastFetched, lastSynced, newest, nextDelayS, syncHealth } from '@/board/refresh-timing'

const ok = (id: string, synced_at = '2026-10-05T10:00:00+00:00'): SyncSource => ({
  id,
  name: id,
  state: 'ok',
  synced_at,
  error: null,
})
const failing = (id: string, retry_after: number | null = null): SyncSource => ({
  id,
  name: id,
  state: 'error',
  synced_at: null,
  error: { code: 'jira_unavailable', message: 'down', retry_after },
})

test('polls at the interval unless a tracker asked to wait longer', () => {
  expect(nextDelayS(30, [])).toBe(30)
  expect(nextDelayS(30, [failing('jira')])).toBe(30)
  expect(nextDelayS(30, [failing('jira', 120)])).toBe(120)
  expect(nextDelayS(60, [failing('jira', 5)])).toBe(60)
  expect(nextDelayS(30, [failing('jira', 900)])).toBe(300)
})

test('health is green, amber or red by how many trackers fail', () => {
  expect(syncHealth([ok('jira'), ok('linear')], null)).toBe('ok')
  expect(syncHealth([ok('jira'), failing('linear')], null)).toBe('partial')
  expect(syncHealth([failing('jira')], null)).toBe('down')
  expect(syncHealth([ok('jira')], new Error('server down'))).toBe('down')
  expect(syncHealth([], null)).toBe('ok')
})

test('lastSynced picks the newest tracker sync', () => {
  expect(lastSynced([ok('a', '2026-10-05T10:00:00Z'), ok('b', '2026-10-05T10:01:00Z')])).toBe(
    Date.parse('2026-10-05T10:01:00Z'),
  )
  expect(lastSynced([failing('a')])).toBe(0)
})

const task = (key: string, status: string, fetched_at: string): Task => ({
  source: 'demo',
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
