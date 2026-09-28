/*
 * Turning engine scores into "winning chances" a person understands.
 *
 * Lichess formula: win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 * where cp is the score in centipawns (100 = a pawn ahead).
 */
import type { Color } from 'chess.js'
import type { EngineLine } from './stockfish'

export function winPercentFromCp(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/** Winning chances (0 to 100) for the side to move, from one engine line. */
export function winPercentForMover(line: Pick<EngineLine, 'cp' | 'mate'>): number {
  if (line.mate !== undefined) return line.mate > 0 ? 100 : 0
  return winPercentFromCp(line.cp ?? 0)
}

/** Winning chances for `me`, given a line scored for the side to move. */
export function winPercentFor(
  me: Color,
  sideToMove: Color,
  line: Pick<EngineLine, 'cp' | 'mate'>,
): number {
  const mover = winPercentForMover(line)
  return me === sideToMove ? mover : 100 - mover
}

export type Chances = { win: number; draw: number; loss: number }

/** How often an even game between learners ends in a draw (roughly). */
const EVEN_DRAW_RATE = 0.1

/**
 * Split an expected score (the Lichess win %, 0 to 100) into win, draw and
 * loss chances for everyday players: about 10% draws when the game is even,
 * fewer as one side pulls ahead. (Stockfish's own draw figure is tuned for
 * engines, where most even games are drawn, so we don't use it.)
 */
export function outcomeChances(expectedPct: number): Chances {
  const e = Math.min(1, Math.max(0, expectedPct / 100))
  const draw = EVEN_DRAW_RATE * (1 - Math.abs(2 * e - 1))
  return {
    win: Math.max(0, (e - draw / 2) * 100),
    draw: draw * 100,
    loss: Math.max(0, (1 - e - draw / 2) * 100),
  }
}

/** Engine score in centipawns for the side to move, capped so a forced mate counts as a big number. */
export function cappedCp(line: Pick<EngineLine, 'cp' | 'mate'>, cap = 2000): number {
  if (line.mate !== undefined) return line.mate > 0 ? cap : -cap
  return Math.max(-cap, Math.min(cap, line.cp ?? 0))
}
