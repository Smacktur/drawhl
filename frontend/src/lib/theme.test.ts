import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { getTheme, initTheme, setTheme, useTheme } from '@/lib/theme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

test('defaults to light', () => {
  initTheme()
  expect(getTheme()).toBe('light')
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})

test('dark choice toggles the class and survives a remount', () => {
  const first = renderHook(() => useTheme())
  act(() => first.result.current.setTheme('dark'))
  expect(first.result.current.resolved).toBe('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  first.unmount()

  document.documentElement.classList.remove('dark')
  initTheme()
  const second = renderHook(() => useTheme())
  expect(second.result.current.theme).toBe('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
})

test('system follows the OS preference', () => {
  setTheme('system')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  expect(document.documentElement.classList.contains('dark')).toBe(prefersDark)
})
