import { expect, test } from 'vitest'
import type { Task } from '@/api/tasks'
import { indexTasks, taskRef } from '@/canvas/tasks-context'

const task = (source: string, summary: string) => ({ source, key: 'ABC-1', summary }) as Task

test('a task that names no tracker is looked up by its bare key', () => {
  expect(taskRef({ key: 'ABC-1' })).toBe('ABC-1')
  expect(taskRef({ key: 'ABC-1', source: 'demo' })).toBe('demo:ABC-1')
})

test('one key in two trackers is two tasks, and the bare key is the instance tracker', () => {
  const jira = task('jira', 'From Jira')
  const demo = task('demo', 'From the demo')
  const index = indexTasks({ 'jira:ABC-1': jira, 'demo:ABC-1': demo }, 'jira')
  expect(index['jira:ABC-1']).toBe(jira)
  expect(index['demo:ABC-1']).toBe(demo)
  expect(index['ABC-1']).toBe(jira)
})
