/*
 * Your "Chess words" collection: which terms and openings you've met,
 * saved in this browser (localStorage). Wrapped in try/catch everywhere.
 */
import { useSyncExternalStore } from 'react'

export type Learned = {
  /** Word id -> ISO date first learned. */
  words: Record<string, string>
  /** Opening family -> ISO date first met. */
  openings: Record<string, string>
}

const KEY = 'pawnce.learned.v1'
const EMPTY: Learned = { words: {}, openings: {} }

let cache: Learned | null = null
const listeners = new Set<() => void>()

function read(): Learned {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Learned>) : {}
    cache = { words: parsed.words ?? {}, openings: parsed.openings ?? {} }
  } catch {
    cache = { ...EMPTY }
  }
  return cache
}

function write(next: Learned) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Not saved; it still works for this visit.
  }
  listeners.forEach((l) => l())
}

export function loadLearned(): Learned {
  return read()
}

export function learnWord(id: string) {
  const cur = read()
  if (cur.words[id]) return
  write({ ...cur, words: { ...cur.words, [id]: new Date().toISOString() } })
}

export function learnOpening(family: string) {
  const cur = read()
  if (cur.openings[family]) return
  write({ ...cur, openings: { ...cur.openings, [family]: new Date().toISOString() } })
}

/** React hook: the collection, updating live as you learn. */
export function useLearned(): Learned {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => EMPTY,
  )
}
