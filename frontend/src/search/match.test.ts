import { expect, test } from 'vitest'
import { otherLayout } from './layout'
import { highlight, normalize, rank, snippet, words } from './match'

const entry = (text: string, key?: string) => ({
  haystack: normalize([key, text].filter(Boolean).join('\n')),
  head: normalize(text),
  key: key && normalize(key),
})

test('normalizes case and accents, ё reads as е', () => {
  expect(normalize('Café Ёлка')).toBe('cafe елка')
  expect(words('  Deploy   QA ')).toEqual(['deploy', 'qa'])
})

test('every word must be found, in any order', () => {
  const ping = entry('Ping QA after deploy')
  expect(rank(ping, words('qa dep'))).toBeGreaterThanOrEqual(0)
  expect(rank(ping, words('qa release'))).toBe(-1)
})

test('ranks exact key, then prefix, then word starts, then anywhere', () => {
  const q = (text: string) => words(text)
  expect(rank(entry('Login page', 'DEMO-1'), q('demo-1'))).toBe(0)
  expect(rank(entry('Deploy window'), q('deploy'))).toBe(1)
  expect(rank(entry('Ping QA after deploy'), q('dep qa'))).toBe(2)
  expect(rank(entry('Redeploy'), q('deploy'))).toBe(3)
})

test('highlights every word in the original text, accents included', () => {
  expect(highlight('Ping QA after deploy', words('qa dep'))).toEqual([
    [5, 7],
    [14, 17],
  ])
  expect(highlight('Café au lait', words('cafe'))).toEqual([[0, 4]])
  expect(highlight('aaa', words('aa'))).toEqual([[0, 3]])
})

test('a snippet keeps one line around the first match', () => {
  const long = `${'intro '.repeat(30)}the deploy happens here ${'tail '.repeat(30)}`
  const cut = snippet(long, words('deploy'), 60)
  expect(cut.text.startsWith('…')).toBe(true)
  expect(cut.text.endsWith('…')).toBe(true)
  const [start, end] = cut.ranges[0]
  expect(cut.text.slice(start, end)).toBe('deploy')
  expect(snippet('two\nlines', [])).toEqual({ text: 'two lines', ranges: [] })
})

test('a query typed on the wrong layout reads on the other one', () => {
  expect(otherLayout('вуздщн')).toBe('deploy')
  expect(otherLayout('ping')).toBe('зштп')
  expect(otherLayout('123')).toBeNull()
})
