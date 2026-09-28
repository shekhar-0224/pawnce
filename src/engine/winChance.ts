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
