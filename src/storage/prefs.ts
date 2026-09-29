/*
 * Small player preferences, saved in this browser.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'pawnce.pauseForWords'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

/** Pause the game to show a flash card when a new chess word appears (on by default). */
export function usePauseForWords(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => true,
  )
  const set = (next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off')
    } catch {
      // Not remembered after this visit.
    }
    listeners.forEach((l) => l())
  }
  return [on, set]
}
