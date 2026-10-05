import { expect, test } from 'vitest'
import { releaseVelocity } from '@/canvas/useInertia'

test('a fast flick keeps its speed; a pause before release stops the glide', () => {
  const flick = [
    { t: 0, x: 0, y: 0 },
    { t: 50, x: 50, y: -25 },
  ]
  expect(releaseVelocity(flick, 60)).toEqual({ x: 1, y: -0.5 })
  expect(releaseVelocity(flick, 200)).toBeNull()
  expect(
    releaseVelocity(
      [
        { t: 0, x: 0, y: 0 },
        { t: 50, x: 2, y: 0 },
      ],
      60,
    ),
  ).toBeNull()
})
