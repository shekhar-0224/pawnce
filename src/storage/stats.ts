/*
 * Lifetime totals: games, results and time played, per bot too. Recent
 * games keep only the last 20, so these running totals live separately.
 * Saved in this browser only, wrapped in try/catch like all storage.
 */
import type { BotId } from '../engine/bots'
import type { Result } from '../chess/outcome'
import { loadRecentGames } from './recentGames'

type Tally = { win: number; draw: number; loss: number }

export type LifetimeStats = {
  games: number
  results: Tally
  byBot: Partial<Record<BotId, Tally>>
  /** Time spent in games, from the first move to the end (ms). */
  timeMs: number
  /** ISO date of the first counted game. */
  since: string | null
  /** Ids already counted, so a game is never counted twice. */
  counted: string[]
}

const KEY = 'pawnce.stats.v1'
/** One game never counts for more than this (a tab left open overnight). */
const MAX_GAME_MS = 3 * 60 * 60 * 1000

const empty = (): LifetimeStats => ({ games: 0, results: { win: 0, draw: 0, loss: 0 }, byBot: {}, timeMs: 0, since: null, counted: [] })

function add(s: LifetimeStats, g: { id: string; bot: BotId; result: Result; date: string; durationMs?: number }) {
  if (s.counted.includes(g.id)) return s
  const byBot = { ...s.byBot, [g.bot]: { ...(s.byBot[g.bot] ?? { win: 0, draw: 0, loss: 0 }) } }
  byBot[g.bot]![g.result] += 1
  return {
    games: s.games + 1,
    results: { ...s.results, [g.result]: s.results[g.result] + 1 },
    byBot,
    timeMs: s.timeMs + Math.min(MAX_GAME_MS, Math.max(0, g.durationMs ?? 0)),
    since: !s.since || g.date < s.since ? g.date : s.since,
    counted: [g.id, ...s.counted].slice(0, 500),
  }
}

export function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<LifetimeStats>) }
  } catch {
    return empty()
  }
  // First visit since stats existed: start from the saved recent games.
  let s = empty()
  for (const g of loadRecentGames()) s = add(s, g)
  save(s)
  return s
}

function save(s: LifetimeStats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Not saved; the totals just won't grow this time.
  }
}

/** Count a finished game (once). */
export function recordGameStats(g: { id: string; bot: BotId; result: Result; date: string; durationMs?: number }) {
  save(add(loadStats(), g))
}

/** "1h 25m", "12 min", "<1 min". */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 1) return ms > 0 ? '<1 min' : '0 min'
  const h = Math.floor(min / 60)
  return h ? `${h}h ${min % 60}m` : `${min} min`
}
