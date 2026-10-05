import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Same key and logic as the inline script in index.html, which applies the theme before first paint.
const KEY = 'drawhl.theme'
const listeners = new Set<() => void>()

function darkQuery() {
  return window.matchMedia('(prefers-color-scheme: dark)')
}

// Storage can throw when site data is blocked; the theme then lives only for this page.
let fallback: Theme = 'light'

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'dark' || stored === 'system' ? stored : 'light'
  } catch {
    return fallback
  }
}

export function resolvedTheme(): 'light' | 'dark' {
  const theme = getTheme()
  if (theme === 'system') return darkQuery().matches ? 'dark' : 'light'
  return theme
}

function apply() {
  document.documentElement.classList.toggle('dark', resolvedTheme() === 'dark')
  listeners.forEach((listener) => listener())
}

export function setTheme(theme: Theme) {
  fallback = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Keep the in-memory choice.
  }
  apply()
}

export function initTheme() {
  apply()
  darkQuery().addEventListener('change', apply)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as const)
  const resolved = useSyncExternalStore(subscribe, resolvedTheme, () => 'light' as const)
  return { theme, resolved, setTheme }
}
