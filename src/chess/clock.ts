/*
 * Chess clocks: the time controls you can pick, and the "can this side
 * still checkmate?" rule used when someone runs out of time.
 */
import type { Chess, Color } from 'chess.js'

export type TimeControlId =
  | 'none'
  | 'bullet-1'
  | 'bullet-2'
  | 'blitz-3'
  | 'blitz-5'
  | 'rapid-10'
  | 'rapid-15'
  | 'classical-30'

export type Speed = 'Bullet' | 'Blitz' | 'Rapid' | 'Classical'

export type TimeControl = {
  id: TimeControlId
  speed: Speed | null
  /** Starting time for each side, in milliseconds. 0 means no clock. */
  initialMs: number
  /** Time added after each of your moves, in milliseconds. */
  incrementMs: number
  /** Short label like "3+2" (minutes + seconds per move). */
  label: string
}

const tc = (id: TimeControlId, speed: Speed, minutes: number, increment: number): TimeControl => ({
  id,
  speed,
  initialMs: minutes * 60_000,
  incrementMs: increment * 1000,
  label: `${minutes}+${increment}`,
})

export const TIME_CONTROLS: Record<TimeControlId, TimeControl> = {
  none: { id: 'none', speed: null, initialMs: 0, incrementMs: 0, label: 'No clock' },
  'bullet-1': tc('bullet-1', 'Bullet', 1, 0),
  'bullet-2': tc('bullet-2', 'Bullet', 2, 1),
  'blitz-3': tc('blitz-3', 'Blitz', 3, 2),
  'blitz-5': tc('blitz-5', 'Blitz', 5, 0),
  'rapid-10': tc('rapid-10', 'Rapid', 10, 0),
  'rapid-15': tc('rapid-15', 'Rapid', 15, 10),
  'classical-30': tc('classical-30', 'Classical', 30, 0),
}

/** Grouped for the picker on the start screen. */
export const TIME_CONTROL_GROUPS: { speed: Speed | null; label: string; ids: TimeControlId[] }[] = [
  { speed: null, label: 'Relaxed', ids: ['none'] },
  { speed: 'Bullet', label: 'Bullet', ids: ['bullet-1', 'bullet-2'] },
  { speed: 'Blitz', label: 'Blitz', ids: ['blitz-3', 'blitz-5'] },
  { speed: 'Rapid', label: 'Rapid', ids: ['rapid-10', 'rapid-15'] },
  { speed: 'Classical', label: 'Classical', ids: ['classical-30'] },
]

export const hasClock = (t: TimeControl) => t.initialMs > 0

/** Long name for headers, e.g. "Blitz 3+2". */
export const timeControlName = (t: TimeControl) => (t.speed ? `${t.speed} ${t.label}` : t.label)

/**
 * Could `color` ever deliver checkmate with the pieces it has left?
 * If a player runs out of time but the opponent could never mate, the
 * game is a draw instead of a loss (the official rule).
 * Simplified: a lone king, king + one knight, or king + one bishop can't.
 */
export function hasMatingMaterial(game: Chess, color: Color): boolean {
  let minors = 0
  for (const row of game.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== color) continue
      if (sq.type === 'p' || sq.type === 'r' || sq.type === 'q') return true
      if (sq.type === 'n' || sq.type === 'b') minors++
    }
  }
  return minors >= 2
}

/** "3:05", or "0:07.4" (with tenths) when under 10 seconds. */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms)
  if (clamped < 10_000) {
    const tenths = Math.floor(clamped / 100)
    return `0:0${Math.floor(tenths / 10)}.${tenths % 10}`
  }
  const total = Math.ceil(clamped / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
