/*
 * Finished games, saved in this browser only (localStorage). No login.
 * Every read and write is wrapped in try/catch: storage can be full,
 * blocked (private mode) or hold old data we can't parse.
 */
import type { TimeControlId } from '../chess/clock'
import type { BotId } from '../engine/bots'
import type { Side } from '../chess/game'
import type { Quality } from '../chess/naming'
import type { EndReason, Result } from '../chess/outcome'

/** A move's grade, saved with the game so its summary can be reopened later. */
export type SavedVerdict = {
  quality: Quality
  winBefore: number
  winAfter: number
  cpLoss: number
  better: string | null
  betterMove: { from: string; to: string } | null
} | null

export type SavedGame = {
  id: string
  /** ISO date string of when the game ended. */
  date: string
  bot: BotId
  myColor: Side
  result: Result
  reason: EndReason
  /** Number of full moves (1. e4 e5 counts as one). */
  moves: number
  /** Missing on games saved before clocks existed. */
  timeControl?: TimeControlId
  pgn: string
  /** Every move in SAN, in order (games saved before summaries existed lack these). */
  sans?: string[]
  /** Each move's grade, filled in as the engine finishes judging. */
  verdicts?: SavedVerdict[]
  /** Chess words met for the very first time in this game. */
  newWords?: string[]
  /** The summary headline and one-line explanation. */
  title?: string
  detail?: string
  /** Time from the first move to the end (ms). Missing on older games. */
  durationMs?: number
}

const KEY = 'pawnce.recentGames.v1'
const MAX = 20

export function loadRecentGames(): SavedGame[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedGame[]).slice(0, MAX) : []
  } catch {
    return []
  }
}

/** A fresh id for a game, used in its link: /game/<id>/summary. */
export function newGameId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function loadGame(id: string): SavedGame | null {
  return loadRecentGames().find((g) => g.id === id) ?? null
}

/** Save a finished game (or replace it, if a game with that id exists). */
export function saveGame(game: SavedGame): void {
  try {
    const next = [game, ...loadRecentGames().filter((g) => g.id !== game.id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the game just isn't remembered.
  }
}

/** Add details to a saved game, e.g. grades that finished after the game ended. */
export function updateGame(id: string, patch: Partial<SavedGame>): void {
  try {
    const games = loadRecentGames()
    const i = games.findIndex((g) => g.id === id)
    if (i < 0) return
    games[i] = { ...games[i], ...patch }
    localStorage.setItem(KEY, JSON.stringify(games))
  } catch {
    // Not saved; the summary will just show fewer grades later.
  }
}

/** Days in a row (ending today or yesterday) with at least one finished game. */
export function playStreak(games: SavedGame[], now = new Date()): number {
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const days = new Set(games.map((g) => day(new Date(g.date))))
  const cursor = new Date(now)
  if (!days.has(day(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(day(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
