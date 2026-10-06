import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AboutButton } from '@/board/AboutButton'

test('opens the About panel with the version and project links', async () => {
  render(<AboutButton />)
  fireEvent.click(screen.getByRole('button', { name: 'About drawhl' }))
  expect(await screen.findByRole('link', { name: 'dev' })).toHaveAttribute(
    'href',
    'https://github.com/Smacktur/drawhl/releases',
  )
  expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/Smacktur/drawhl',
  )
  expect(screen.getByRole('link', { name: /Documentation/ })).toHaveAttribute('target', '_blank')
})
