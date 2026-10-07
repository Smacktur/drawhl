import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { FocusCapsule } from './FocusCapsule'
import { resetFocusStore } from './store'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  vi.setSystemTime(new Date('2026-10-07T10:00:00Z'))
  localStorage.clear()
  resetFocusStore()
})

afterEach(() => {
  vi.useRealTimers()
})

it('starts, counts down in minutes and seconds, and pauses', () => {
  render(<FocusCapsule />)
  expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  expect(screen.getByRole('img', { name: 'Ready to focus · round 1 of 4' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  act(() => vi.advanceTimersByTime(61_000))
  expect(screen.getByRole('timer')).toHaveTextContent('23:59')
  expect(screen.getByRole('img', { name: 'Focus · round 1 of 4' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  act(() => vi.advanceTimersByTime(120_000))
  expect(screen.getByRole('timer')).toHaveTextContent('23:59')
})

it('keeps the countdown across a reload', () => {
  const first = render(<FocusCapsule />)
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  first.unmount()
  resetFocusStore()

  vi.setSystemTime(new Date('2026-10-07T10:05:00Z'))
  render(<FocusCapsule />)
  expect(screen.getByRole('timer')).toHaveTextContent('20:00')
})

it('shows the end of a focus and what comes next', () => {
  render(<FocusCapsule />)
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  act(() => vi.advanceTimersByTime(25 * 60_000))
  expect(screen.getByRole('timer')).toHaveTextContent('00:00')
  expect(screen.getByRole('img', { name: 'Focus done · take a short break' })).toBeInTheDocument()
  expect(screen.getByText('Next: Short break · 5 min')).toBeInTheDocument()
})
