/*
 * Finished games, saved in this browser only (localStorage). No login.
 * Every read and write is wrapped in try/catch: storage can be full,
 * blocked (private mode) or hold old data we can't parse.
 */
import type { TimeControlId } from '../chess/clock'
import type { BotId } from '../engine/bots'
import type { Side } from '../chess/game'
import type { EndReason, Result } from '../chess/outcome'

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

export function saveGame(game: Omit<SavedGame, 'id'>): void {
  try {
    const entry: SavedGame = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...game }
    const next = [entry, ...loadRecentGames()].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the game just isn't remembered.
  }
}
