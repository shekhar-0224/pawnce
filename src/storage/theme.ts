/*
 * Light or dark. Until you pick one, it follows the device ("auto" under the
 * hood). Saved in this browser and applied as data-theme on <html>;
 * index.html applies it before first paint.
 */
import { useSyncExternalStore } from 'react'

export type ThemePref = 'auto' | 'light' | 'dark'

const KEY = 'pawnce.theme'
const listeners = new Set<() => void>()

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

let current: ThemePref = read()

function apply(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'auto') delete root.dataset.theme
  else root.dataset.theme = pref
  // The browser bar follows the page background.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#ffffff')
}

export function setThemePref(pref: ThemePref) {
  current = pref
  try {
    if (pref === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    // Not remembered; it still applies for this visit.
  }
  apply(pref)
  listeners.forEach((l) => l())
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

/** Keep the browser bar color right on load and when the device theme flips. */
export function initTheme() {
  apply(current)
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => apply(current))
}

/** The look you're actually seeing right now. */
export function effectiveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'auto') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
