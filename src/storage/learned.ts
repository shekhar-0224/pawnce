/*
 * Your chess vocabulary: every chess word you've met across games (seen,
 * played by you, or missed), and the openings you've met. Saved in this
 * browser (localStorage), wrapped in try/catch everywhere.
 *
 * A word is "New" until you tap its explainer or meet it 3 times; after
 * that it counts as known.
 */
import { useSyncExternalStore } from 'react'

export type WordStats = {
  /** ISO date first met. */
  first: string
  /** Times it showed up in your games (either side). */
  seen: number
  /** Times you played it yourself. */
  played: number
  /** Times you could have played it but didn't. */
  missed: number
  /** ISO date you opened its explainer. */
  tapped?: string
  /** Where you first met it: the game's id and the move (0-based ply). */
  game?: string
  ply?: number
}

export type Learned = {
  words: Record<string, WordStats>
  /** Opening family -> ISO date first met. */
  openings: Record<string, string>
}

export type Sighting = 'seen' | 'played' | 'missed'

const KEY = 'pawnce.vocab.v2'
const OLD_KEY = 'pawnce.learned.v1'
const EMPTY: Learned = { words: {}, openings: {} }

/** Meeting a word this many times makes it known, even without a tap. */
export const KNOWN_AFTER = 3

export const isKnown = (s: WordStats | undefined) => !!s && (!!s.tapped || s.seen >= KNOWN_AFTER)
/** Show the "New" tag: never tapped, and met at most 3 times. */
export const isNew = (s: WordStats | undefined) => !s || (!s.tapped && s.seen <= KNOWN_AFTER)

/** A pattern counts as learned once you've played it yourself, not just seen it. */
export const isLearnedPattern = (s: WordStats | undefined) => !!s && s.played >= 1

let cache: Learned | null = null
const listeners = new Set<() => void>()

function read(): Learned {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Learned>
      cache = { words: parsed.words ?? {}, openings: parsed.openings ?? {} }
    } else {
      // Carry over the first version: words were dates of "Got it".
      const old = localStorage.getItem(OLD_KEY)
      const parsed = old ? (JSON.parse(old) as { words?: Record<string, string>; openings?: Record<string, string> }) : {}
      const words: Record<string, WordStats> = {}
      for (const [id, date] of Object.entries(parsed.words ?? {})) {
        words[id] = { first: date, seen: 1, played: 0, missed: 0, tapped: date }
      }
      cache = { words, openings: parsed.openings ?? {} }
    }
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

// Each sighting is counted once, even if the screen re-renders.
const recorded = new Set<string>()

/**
 * Count one sighting of a word. `key` identifies it (game, move, word), so
 * the same sighting is never counted twice.
 */
export function recordWord(id: string, how: Sighting, key: string, where?: { game: string; ply: number }) {
  if (recorded.has(key)) return
  recorded.add(key)
  const cur = read()
  const s = cur.words[id] ?? { first: new Date().toISOString(), seen: 0, played: 0, missed: 0, ...where }
  const next: WordStats = {
    ...s,
    seen: s.seen + 1,
    played: s.played + (how === 'played' ? 1 : 0),
    missed: s.missed + (how === 'missed' ? 1 : 0),
  }
  write({ ...cur, words: { ...cur.words, [id]: next } })
}

/** You opened the explainer (or tapped "Got it"): the word is known. */
export function learnWord(id: string) {
  const cur = read()
  const s = cur.words[id] ?? { first: new Date().toISOString(), seen: 0, played: 0, missed: 0 }
  if (s.tapped) return
  write({ ...cur, words: { ...cur.words, [id]: { ...s, tapped: new Date().toISOString() } } })
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
