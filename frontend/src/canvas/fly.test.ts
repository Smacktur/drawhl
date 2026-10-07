import { expect, test } from 'vitest'
import { zoomFor } from './fly'

test('keeps the zoom for small elements and zooms out to fit big ones', () => {
  window.innerWidth = 1000
  window.innerHeight = 800
  expect(zoomFor(40, 40, 1.5)).toBe(1.5)
  expect(zoomFor(40, 40, 0.3)).toBe(0.8)
  expect(zoomFor(1600, 400, 1)).toBe(0.5)
})
