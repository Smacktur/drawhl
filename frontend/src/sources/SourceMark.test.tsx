import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { BoardSourcesContext } from '@/sources/board-sources'
import { BoardSourceMark, SourceMark } from '@/sources/SourceMark'

test('a tracker shows its own logo file', () => {
  render(<SourceMark source="jira" />)
  expect(screen.getByRole('img', { name: 'Jira' }).getAttribute('src')).toContain('svg')
})

test('demo tasks carry the tiko emblem, an unknown tracker a neutral icon', () => {
  render(
    <>
      <SourceMark source="demo" />
      <SourceMark source="elsewhere" />
    </>,
  )
  expect(screen.getByRole('img', { name: 'Demo task' })).toBeTruthy()
  expect(screen.getByLabelText('Unknown tracker')).toBeTruthy()
})

test('a board with one tracker shows no marks', () => {
  render(
    <BoardSourcesContext.Provider value={{ mixed: false, defaultSource: 'jira' }}>
      <BoardSourceMark source="jira" />
    </BoardSourcesContext.Provider>,
  )
  expect(screen.queryByRole('img')).toBeNull()
})

test('on a mixed board a task that names no tracker gets the mark of the instance tracker', () => {
  render(
    <BoardSourcesContext.Provider value={{ mixed: true, defaultSource: 'jira' }}>
      <BoardSourceMark />
      <BoardSourceMark source="demo" />
    </BoardSourcesContext.Provider>,
  )
  expect(screen.getByRole('img', { name: 'Jira' })).toBeTruthy()
  expect(screen.getByRole('img', { name: 'Demo task' })).toBeTruthy()
})
