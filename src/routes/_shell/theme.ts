// Light and dark. The system setting is followed unless someone picks one; the choice is saved per
// device ('slate-theme' in localStorage) and applied as data-theme on <html>, which every token
// in src/styles/tokens.css already reads.

import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export const THEME_KEY = 'slate-theme'

/** The page background in each theme, for the browser and phone status bar colour. */
const PAGE_COLOUR = { light: '#f7f2ea', dark: '#1b1714' } as const

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function systemIsDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

let preference: ThemePreference = typeof window === 'undefined' ? 'system' : readStored()
const listeners = new Set<() => void>()

function apply() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (preference === 'system') delete root.dataset.theme
  else root.dataset.theme = preference
  const resolved = preference === 'system' ? (systemIsDark() ? 'dark' : 'light') : preference
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
  }
  meta.content = PAGE_COLOUR[resolved]
}

function change(next: ThemePreference) {
  if (next === preference) return
  preference = next
  apply()
  for (const listener of listeners) listener()
}

export function setThemePreference(next: ThemePreference) {
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
  } catch {
    // Not saved (private window), but still applied for this visit.
  }
  change(next)
}

let started = false

/**
 * Applies the saved theme and keeps it applied: follows the system while on 'system', and picks up
 * a choice made in another tab. Call once, before the first render, so there is no flash.
 */
export function startTheme() {
  apply()
  if (started || typeof window === 'undefined') return
  started = true
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
  } catch {
    // Old browsers: the colour-scheme CSS still follows the system; only the status bar won't.
  }
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY || event.key === null) change(readStored())
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const read = () => preference

/** The saved choice and a setter, e.g. for the account menu's Appearance options. */
export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  return [useSyncExternalStore(subscribe, read, read), setThemePreference]
}
