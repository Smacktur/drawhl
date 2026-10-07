import { expect, test } from 'vitest'
import { dropLastToken, filterText, parseQuery, suggest } from './query'

test('reads filters, quoted values and the frames mark', () => {
  expect(parseQuery('#spr @anna status:"in review" login ')).toEqual({
    text: 'spr login',
    filters: [
      { field: 'assignee', value: 'anna' },
      { field: 'status', value: 'in review' },
    ],
    framesOnly: true,
    typing: undefined,
  })
  expect(parseQuery('#').framesOnly).toBe(true)
  expect(parseQuery('Type:Bug').filters).toEqual([{ field: 'type', value: 'Bug' }])
})

test('a filter at the end of the input is being typed until a space', () => {
  expect(parseQuery('login @an').typing).toEqual({ field: 'assignee', value: 'an' })
  expect(parseQuery('@').typing).toEqual({ field: 'assignee', value: '' })
  expect(parseQuery('@"Anna L').typing).toEqual({ field: 'assignee', value: 'Anna L' })
  expect(parseQuery('@anna ').typing).toBeUndefined()
  expect(parseQuery('login').typing).toBeUndefined()
})

test('a chip goes back to text and replaces the typed filter', () => {
  expect(filterText({ field: 'assignee', value: 'Anna Lee' })).toBe('@"Anna Lee"')
  expect(filterText({ field: 'status', value: 'Done' })).toBe('status:Done')
  expect(dropLastToken('login @"Anna L')).toBe('login')
  expect(dropLastToken('status:pr')).toBe('')
})

test('suggests values on the board that hold the typed part, most used first', () => {
  const facets = [
    { assignee: 'Anna Lee' },
    { assignee: 'Anna Lee' },
    { assignee: 'Hanna Berg' },
    { assignee: 'Oleg Smirnov' },
    {},
  ]
  expect(suggest(facets, { field: 'assignee', value: 'ann' })).toEqual([
    { value: 'Anna Lee', count: 2 },
    { value: 'Hanna Berg', count: 1 },
  ])
  expect(suggest(facets, { field: 'assignee', value: '' })).toHaveLength(3)
})
