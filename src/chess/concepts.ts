/*
 * Which chess words a move shows off, most interesting first.
 * Used to decide when to show a Learn card (first time only).
 */
import type { Move } from 'chess.js'
import type { Quality } from './naming'
import { detectTactics, mainTactic } from './tactics'

/** Word ids for one move. `quality` only for your own moves. */
export function conceptsOf(move: Move, quality: Quality | null, byMe: boolean, ply: number): string[] {
  const ids: string[] = []
  const tactic = mainTactic(detectTactics(move.before, move))
  if (tactic) ids.push(tactic.kind)
  if (move.san.endsWith('#')) ids.push('checkmate')
  if (move.isEnPassant()) ids.push('en-passant')
  if (move.isKingsideCastle() || move.isQueensideCastle()) ids.push('castling')
  if (move.promotion) ids.push(move.promotion === 'q' ? 'promotion' : 'underpromotion')
  if (move.san.endsWith('+') && !tactic) ids.push('check')
  if (byMe && quality && quality !== 'good') ids.push(quality)
  if (byMe && ply < 20) {
    const backRank = move.color === 'w' ? '1' : '8'
    if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === backRank) ids.push('development')
    if (move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) ids.push('center')
  }
  return ids
}

/** Words too everyday to interrupt for; they're collected quietly. */
export const QUIET_WORDS = new Set(['capture'])
