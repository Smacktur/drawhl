import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { AppNode } from '@/canvas/types'
import { buildIndex } from './index'
import { SearchPalette } from './SearchPalette'

const at = { x: 0, y: 0 }
const sticky = (id: string, text: string): AppNode => ({
  id,
  type: 'sticky',
  position: at,
  data: { text, color: 'yellow' },
})
const index = buildIndex(
  [
    { id: 'f', type: 'frame', position: at, data: { title: 'Sprint 12' } },
    sticky('a', 'Ping QA after deploy'),
    sticky('b', 'Deploy window on Friday'),
    sticky('c', 'Lunch'),
  ],
  {},
)

function setup(recent: string[] = []) {
  const onChoose = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <SearchPalette
      open
      onOpenChange={onOpenChange}
      index={index}
      recent={recent}
      onChoose={onChoose}
    />,
  )
  const input = screen.getByRole('combobox', { name: 'Search the board' })
  return { input, onChoose, onOpenChange }
}

const options = () => screen.queryAllByRole('option').map((o) => o.textContent)

test('an empty query lists recent jumps and frames', () => {
  setup(['c'])
  expect(screen.getByRole('group', { name: 'Recent' })).toHaveTextContent('Lunch')
  expect(screen.getByRole('group', { name: 'Frames' })).toHaveTextContent('Sprint 12')
})

test('typing ranks matches and highlights them', () => {
  const { input } = setup()
  fireEvent.change(input, { target: { value: 'deploy' } })
  expect(options()).toEqual(['Deploy window on Friday', 'Ping QA after deploy'])
  expect(screen.getAllByText('Deploy', { selector: 'mark' })).toHaveLength(1)
})

test('arrows wrap, Enter chooses the picked row', () => {
  const { input, onChoose } = setup()
  fireEvent.change(input, { target: { value: 'deploy' } })
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
})

test('a click chooses a row', () => {
  const { input, onChoose } = setup()
  fireEvent.change(input, { target: { value: 'lunch' } })
  fireEvent.click(screen.getByRole('option'))
  expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }))
})

test('says when nothing matches and when the layout was wrong', () => {
  const { input } = setup()
  fireEvent.change(input, { target: { value: 'zebra' } })
  expect(screen.getByText('Nothing on this board matches "zebra".')).toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'дгтср' } })
  expect(screen.getByText(/Showing results for/)).toHaveTextContent('lunch')
  expect(options()).toEqual(['Lunch'])
})

test('the search shortcut closes the open palette', () => {
  const { input, onOpenChange } = setup()
  fireEvent.keyDown(input, { key: 'k', metaKey: true })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})
