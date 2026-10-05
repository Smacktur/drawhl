import { expect, test } from 'vitest'
import { applySuggestion, jqlContext, rank, tokenize } from '@/lib/jql'

const at = (text: string) => jqlContext(text, text.length)

test('tokenizes strings, operators and function calls', () => {
  expect(
    tokenize('status != "In Progress" AND assignee = currentUser()').map((t) => t.text),
  ).toEqual(['status', '!=', '"In Progress"', 'AND', 'assignee', '=', 'currentUser()'])
})

test('expects a field first and after AND or OR', () => {
  expect(at('sta')).toMatchObject({ kind: 'field', token: 'sta', start: 0, first: true })
  expect(at('status = Done AND ')).toMatchObject({ kind: 'field', token: '', first: false })
  expect(at('status = Done or pri')).toMatchObject({ kind: 'field', token: 'pri' })
  expect(at('NOT (')).toMatchObject({ kind: 'field' })
})

test('expects an operator after a field', () => {
  expect(at('status ')).toMatchObject({ kind: 'operator', field: 'status', token: '' })
  expect(at('status !')).toMatchObject({ kind: 'operator', token: '!' })
})

test('expects a value after an operator, also inside lists and after word operators', () => {
  expect(at('status = In')).toMatchObject({
    kind: 'value',
    field: 'status',
    operator: '=',
    token: 'In',
  })
  expect(at('status = "In Pro')).toMatchObject({ kind: 'value', token: '"In Pro' })
  expect(at('status in (Done, ')).toMatchObject({ kind: 'value', operator: 'in', token: '' })
  expect(at('status not in (')).toMatchObject({ kind: 'value', operator: 'not in' })
  expect(at('assignee is ')).toMatchObject({ kind: 'value', operator: 'is' })
  expect(at('assignee is not ')).toMatchObject({ kind: 'value', operator: 'is not' })
})

test('expects a keyword after a complete condition', () => {
  expect(at('status = Done ')).toMatchObject({
    kind: 'keyword',
    keywords: ['AND', 'OR', 'ORDER BY'],
  })
  expect(at('status in (Done) A')).toMatchObject({ kind: 'keyword', token: 'A' })
  expect(at('assignee is EMPTY ')).toMatchObject({ kind: 'keyword' })
  expect(at('status = Done ORDER ')).toMatchObject({ kind: 'keyword', keywords: ['BY'] })
  expect(at('status = Done ORDER BY up')).toMatchObject({ kind: 'field', token: 'up' })
  expect(at('ORDER BY updated ')).toMatchObject({ kind: 'keyword', keywords: ['ASC', 'DESC'] })
})

test('applies a suggestion over the whole token under the cursor', () => {
  const text = 'stat = Done'
  const context = jqlContext(text, 2)
  expect(applySuggestion(text, context, 'status')).toEqual({ text: 'status = Done', cursor: 7 })
  const typed = 'status = "In Pro'
  expect(applySuggestion(typed, at(typed), '"In Progress"')).toEqual({
    text: 'status = "In Progress" ',
    cursor: 23,
  })
})

test('keeps the given order when nothing is typed yet', () => {
  expect(rank(['AND', 'OR', 'ORDER BY'], '', (word) => word)).toEqual(['AND', 'OR', 'ORDER BY'])
})

test('ranks an exact name above longer prefix matches', () => {
  const names = ['"Start date"', 'statusCategory', 'status']
  expect(rank(names, 'status', (n) => n)).toEqual(['status', 'statusCategory'])
  expect(rank(names, 'sta', (n) => n)).toEqual(['status', '"Start date"', 'statusCategory'])
})

test('ranks prefix matches first and ignores quotes and case', () => {
  const names = ['labels', 'status', 'statusCategory', '"Story Points"']
  expect(rank(names, 'stat', (n) => n)).toEqual(['status', 'statusCategory'])
  expect(rank(names, 'st', (n) => n)).toEqual(['status', '"Story Points"', 'statusCategory'])
  expect(rank(names, 'el', (n) => n)).toEqual(['labels'])
})
