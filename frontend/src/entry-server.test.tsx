import { expect, test } from 'vitest'
import { renderPages } from './entry-server'

test('prerenders the home page with visible text and no browser APIs', () => {
  const [home] = renderPages()
  expect(home.path).toBe('/')
  expect(home.hydrate).toBe(true)
  expect(home.body.replace(/<[^>]+>/g, '').trim()).not.toBe('')
})
